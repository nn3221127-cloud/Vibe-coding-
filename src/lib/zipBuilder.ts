import crypto from 'node:crypto';
import { validateRelativeFilePath, scanFilesForSecrets } from './securityPolicy.ts';

export interface ZipInputEntry {
  path: string;
  content: string | Buffer;
}

export interface ZipBuildResult {
  zipBuffer: Buffer;
  sha256: string;
  sizeBytes: number;
  entries: Array<{
    path: string;
    size_bytes: number;
    sha256: string;
    crc32: number;
  }>;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function computeSha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024; // 25 MB safety limit
const MAX_ARCHIVE_FILES = 250;

/**
 * Creates a standards-compliant PKZIP archive in memory with path validation,
 * secret scanning, and SHA-256 manifest generation.
 */
export function createSafeProjectZip(files: ZipInputEntry[]): ZipBuildResult {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Cannot create an archive from an empty file list.');
  }

  if (files.length > MAX_ARCHIVE_FILES) {
    throw new Error(`Archive file count (${files.length}) exceeds maximum safety limit of ${MAX_ARCHIVE_FILES}.`);
  }

  const textFilesForSecretScan = files.map((f) => ({
    path: f.path,
    content: typeof f.content === 'string' ? f.content : f.content.toString('utf8'),
  }));

  const secretScan = scanFilesForSecrets(textFilesForSecretScan);
  if (!secretScan.passed) {
    const summary = secretScan.findings.map((f) => `${f.path} (${f.patternName})`).join(', ');
    throw new Error(`Secret scan blocked archive creation: ${summary}`);
  }

  const localHeaderParts: Buffer[] = [];
  const centralDirParts: Buffer[] = [];
  const manifestEntries: Array<{
    path: string;
    size_bytes: number;
    sha256: string;
    crc32: number;
  }> = [];

  let currentOffset = 0;
  let totalUncompressedBytes = 0;
  const seenPaths = new Set<string>();

  for (const item of files) {
    const pathCheck = validateRelativeFilePath(item.path);
    if (!pathCheck.valid) {
      throw new Error(`Unsafe archive entry path "${item.path}": ${pathCheck.reason}`);
    }

    const cleanPath = pathCheck.normalizedPath;
    if (seenPaths.has(cleanPath)) {
      throw new Error(`Duplicate archive entry path "${cleanPath}".`);
    }
    seenPaths.add(cleanPath);

    const dataBuf = typeof item.content === 'string' ? Buffer.from(item.content, 'utf8') : item.content;
    totalUncompressedBytes += dataBuf.length;
    if (totalUncompressedBytes > MAX_ARCHIVE_BYTES) {
      throw new Error(`Archive size exceeds safety cap of ${MAX_ARCHIVE_BYTES} bytes.`);
    }

    const nameBuf = Buffer.from(cleanPath, 'utf8');
    const crc = computeCrc32(dataBuf);
    const sha256 = computeSha256(dataBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(0, 8); // Compression method: 0 (STORE for universal compatibility & zero zip-bomb risk)
    localHeader.writeUInt16LE(0x0000, 10); // Mod time
    localHeader.writeUInt16LE(0x5d21, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(dataBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(dataBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    localHeaderParts.push(localHeader, dataBuf);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central file header signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(0, 10); // Compression method: STORE
    centralHeader.writeUInt16LE(0x0000, 12); // Mod time
    centralHeader.writeUInt16LE(0x5d21, 14); // Mod date
    centralHeader.writeUInt32LE(crc, 16); // CRC-32
    centralHeader.writeUInt32LE(dataBuf.length, 20); // Compressed size
    centralHeader.writeUInt32LE(dataBuf.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralDirParts.push(centralHeader);

    currentOffset += localHeader.length + dataBuf.length;

    manifestEntries.push({
      path: cleanPath,
      size_bytes: dataBuf.length,
      sha256,
      crc32: crc,
    });
  }

  const centralDirBuffer = Buffer.concat(centralDirParts);
  const eocdBuffer = Buffer.alloc(22);
  eocdBuffer.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocdBuffer.writeUInt16LE(0, 4); // Number of this disk
  eocdBuffer.writeUInt16LE(0, 6); // Disk where central directory starts
  eocdBuffer.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocdBuffer.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocdBuffer.writeUInt32LE(centralDirBuffer.length, 12); // Size of central directory
  eocdBuffer.writeUInt32LE(currentOffset, 16); // Offset of start of central directory
  eocdBuffer.writeUInt16LE(0, 20); // Comment length

  const zipBuffer = Buffer.concat([...localHeaderParts, centralDirBuffer, eocdBuffer]);
  const zipSha256 = computeSha256(zipBuffer);

  return {
    zipBuffer,
    sha256: zipSha256,
    sizeBytes: zipBuffer.length,
    entries: manifestEntries,
  };
}

/**
 * Inspects and verifies a ZIP buffer by reading its End of Central Directory and Central Directory headers.
 */
export function verifyZipArchiveBuffer(zipBuffer: Buffer): {
  valid: boolean;
  fileCount: number;
  filenames: string[];
  reason?: string;
} {
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) {
    return { valid: false, fileCount: 0, filenames: [], reason: 'Buffer is too small to be a valid ZIP archive.' };
  }

  // Locate EOCD signature at end of buffer (no comment)
  const eocdOffset = zipBuffer.length - 22;
  const sig = zipBuffer.readUInt32LE(eocdOffset);
  if (sig !== 0x06054b50) {
    return { valid: false, fileCount: 0, filenames: [], reason: 'Missing End of Central Directory signature.' };
  }

  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirSize = zipBuffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  if (centralDirOffset + centralDirSize > eocdOffset) {
    return { valid: false, fileCount: 0, filenames: [], reason: 'Central directory bounds are corrupted.' };
  }

  const filenames: string[] = [];
  let ptr = centralDirOffset;
  for (let i = 0; i < entryCount; i++) {
    if (ptr + 46 > eocdOffset) {
      return { valid: false, fileCount: i, filenames, reason: 'Truncated central directory entry.' };
    }
    const cSig = zipBuffer.readUInt32LE(ptr);
    if (cSig !== 0x02014b50) {
      return { valid: false, fileCount: i, filenames, reason: 'Invalid central directory file header signature.' };
    }
    const nameLen = zipBuffer.readUInt16LE(ptr + 28);
    const extraLen = zipBuffer.readUInt16LE(ptr + 30);
    const commentLen = zipBuffer.readUInt16LE(ptr + 32);
    const filename = zipBuffer.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');

    const pathCheck = validateRelativeFilePath(filename);
    if (!pathCheck.valid) {
      return { valid: false, fileCount: i, filenames, reason: `Unsafe path inside ZIP: ${filename}` };
    }

    filenames.push(filename);
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return {
    valid: true,
    fileCount: entryCount,
    filenames,
  };
}
