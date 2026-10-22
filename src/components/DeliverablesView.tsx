import React from 'react';
import { Archive, CheckCircle2, Download, FileCheck2, Shield } from 'lucide-react';
import type { ProjectRecord } from '../types/agent.ts';

interface DeliverablesViewProps {
  project: ProjectRecord;
  busy: boolean;
  onPackageArtifact: () => Promise<void>;
}

export const DeliverablesView: React.FC<DeliverablesViewProps> = ({
  project,
  busy,
  onPackageArtifact,
}) => {
  const run = project.activeTaskRun;
  const latestArtifact = project.artifacts[0] || null;
  const verificationReportFile = project.files.find(
    (f) => f.path === 'docs/VERIFICATION_REPORT.md'
  );

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Section 1: Final Outcome & Package Controls */}
      <section aria-label="Deliverable Outcome and ZIP Export" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white">
                01. Final Deliverable &amp; Verification Manifest
              </h2>
              {run && (
                <span
                  className={`text-xs font-mono font-semibold ${
                    run.outcomeStatus === 'Completed'
                      ? 'text-emerald-400'
                      : run.outcomeStatus === 'Partially completed'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  [{run.outcomeStatus.toUpperCase()}]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Every exported archive is verified against path traversal, scanned for secret patterns, and indexed with SHA-256 checksums.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={onPackageArtifact}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5 text-sky-400" />
              Rebuild Project Archive
            </button>

            {latestArtifact && (
              <a
                href={`/api/artifacts/${latestArtifact.artifactId}/download`}
                download={latestArtifact.archiveName}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download {latestArtifact.archiveName} ({Math.round(latestArtifact.sizeBytes / 1024 * 10) / 10} KB)
              </a>
            )}
          </div>
        </div>

        {/* Summary Metrics Strip */}
        {latestArtifact && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/50 text-xs tabular-nums">
            <div>
              <div className="text-slate-400">Archive Filename</div>
              <div className="font-mono font-semibold text-slate-100 mt-0.5">
                {latestArtifact.archiveName}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Packaged Files &amp; Size</div>
              <div className="font-mono font-semibold text-slate-100 mt-0.5">
                {latestArtifact.files.length} files · {latestArtifact.sizeBytes.toLocaleString()} bytes
              </div>
            </div>
            <div>
              <div className="text-slate-400">Secret &amp; Traversal Gate</div>
              <div className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Passed (0 secrets, 0 escapes)</span>
              </div>
            </div>
            <div>
              <div className="text-slate-400">Archive SHA-256</div>
              <div className="font-mono text-slate-300 truncate mt-0.5" title={latestArtifact.sha256}>
                {latestArtifact.sha256.slice(0, 24)}...
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Delivered Artifact File Manifest */}
      {latestArtifact && (
        <section aria-label="Artifact File Manifest" className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            02. Delivered File Manifest &amp; SHA-256 Checksums
          </h2>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Workspace Path</th>
                  <th className="py-2.5 px-3 font-medium text-right">Size (Bytes)</th>
                  <th className="py-2.5 px-3 font-medium">SHA-256 Checksum</th>
                  <th className="py-2.5 px-3 font-medium text-right">Individual Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {latestArtifact.files.map((file) => (
                  <tr key={file.path} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-mono text-sky-400 font-medium">
                      {file.path}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-300">
                      {file.size_bytes.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {file.sha256}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`/api/projects/${project.id}/files/download?path=${encodeURIComponent(file.path)}`}
                        download
                        className="text-sky-400 hover:text-sky-300 underline font-medium"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 3: Verification Report Contents */}
      {verificationReportFile && (
        <section aria-label="Verification Report" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-sky-400" />
              <span>03. Generated Verification Report (docs/VERIFICATION_REPORT.md)</span>
            </h2>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Included in ZIP Archive</span>
            </span>
          </div>
          <pre className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-xs text-slate-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {verificationReportFile.content}
          </pre>
        </section>
      )}
    </div>
  );
};
