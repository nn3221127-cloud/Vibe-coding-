import React, { useState, useEffect } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FilePlus,
  FileText,
  GitCompare,
  Play,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
} from 'lucide-react';
import type { FileDiffResult, ProjectRecord, WorkspaceFile } from '../types/agent.ts';
import { computeUnifiedDiff } from '../lib/agentEngine.ts';

interface WorkspacePanelProps {
  project: ProjectRecord;
  busy: boolean;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onRunValidation: (command?: string) => Promise<void>;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  project,
  busy,
  onSaveFile,
  onDeleteFile,
  onRunValidation,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'diff' | 'preview' | 'terminal'>('code');
  const [draftContent, setDraftContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showNewFileForm, setShowNewFileForm] = useState<boolean>(false);
  const [newFilePath, setNewFilePath] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (project.files.length > 0) {
      const exists = project.files.some((f) => f.path === selectedPath);
      if (!exists) {
        const preferred =
          project.files.find((f) => f.path.startsWith('src/')) || project.files[0];
        setSelectedPath(preferred.path);
        setDraftContent(preferred.content);
        setIsDirty(false);
      } else {
        const current = project.files.find((f) => f.path === selectedPath);
        if (current && !isDirty) {
          setDraftContent(current.content);
        }
      }
    }
  }, [project, selectedPath, isDirty]);

  const selectedFile: WorkspaceFile | undefined = project.files.find(
    (f) => f.path === selectedPath
  );

  const previewHtmlFile: WorkspaceFile | undefined = project.files.find(
    (f) => f.path === 'public/index.html' || f.path.endsWith('.html')
  );

  const filteredFiles = project.files.filter((file) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      file.path.toLowerCase().includes(q) ||
      file.content.toLowerCase().includes(q)
    );
  });

  const handleSelectFile = (file: WorkspaceFile) => {
    setSelectedPath(file.path);
    setDraftContent(file.content);
    setIsDirty(false);
    setFileError(null);
  };

  const handleCopyCode = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback handled by selection
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedFile || busy) return;
    setFileError(null);
    try {
      await onSaveFile(selectedFile.path, draftContent);
      setIsDirty(false);
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'Failed to save file');
    }
  };

  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim() || busy) return;
    setFileError(null);
    try {
      await onSaveFile(newFilePath.trim(), `// ${newFilePath.trim()}\n`);
      setSelectedPath(newFilePath.trim());
      setNewFilePath('');
      setShowNewFileForm(false);
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'Invalid file path');
    }
  };

  const diffResult: FileDiffResult | null = selectedFile
    ? computeUnifiedDiff(selectedFile.path, selectedFile.previousContent, draftContent)
    : null;

  const executions = project.activeTaskRun?.toolExecutions || [];
  const runtimeAvailable =
    project.activeTaskRun?.spec.selectedStack.runtimeAvailable ?? true;

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[540px]">
      {/* Region 3: Workspace File Explorer */}
      <div
        aria-label="Workspace File Explorer"
        className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0d1321] flex flex-col"
      >
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Files ({project.files.length})
            </span>
            <button
              type="button"
              onClick={() => setShowNewFileForm((p) => !p)}
              aria-label="Create new file in workspace"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 border border-slate-800 rounded hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              New File
            </button>
          </div>

          {showNewFileForm && (
            <form onSubmit={handleCreateNewFile} className="space-y-1.5 pt-1">
              <label htmlFor="new-file-path-input" className="sr-only">
                Relative file path
              </label>
              <input
                id="new-file-path-input"
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="e.g. src/helper.ts"
                className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-slate-200"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-medium bg-sky-400 text-slate-950 rounded cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFileForm(false);
                    setFileError(null);
                  }}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {fileError && (
            <div role="alert" className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800/60 p-2 rounded">
              {fileError}
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <label htmlFor="workspace-file-search" className="sr-only">
              Search files and code
            </label>
            <input
              id="workspace-file-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files or code..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Workspace files">
          {filteredFiles.map((file) => {
            const active = file.path === selectedPath;
            return (
              <div
                key={file.path}
                role="listitem"
                className={`group flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors ${
                  active
                    ? 'bg-slate-800/90 text-white'
                    : 'text-slate-300 hover:bg-slate-900/70'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectFile(file)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-mono truncate">{file.path}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                    <span>{file.status}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        file.verificationStatus === 'tested'
                          ? 'text-emerald-400'
                          : file.verificationStatus === 'static-checked' ||
                            file.verificationStatus === 'runtime-checked'
                          ? 'text-sky-400'
                          : 'text-slate-400'
                      }
                    >
                      {file.verificationStatus}
                    </span>
                  </div>
                </button>

                {project.files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteFile(file.path)}
                    aria-label={`Delete file ${file.path}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Region 4: Editor / Diff / Live Preview / Terminal Output */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19]">
        {/* Sub-toolbar with segmented tabs & file actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-800 bg-[#0f172a]">
          {/* Interactive Segmented Tabs */}
          <div
            role="tablist"
            aria-label="Workspace view tabs"
            className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'code'}
              onClick={() => setActiveTab('code')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code Editor
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'diff'}
              onClick={() => setActiveTab('diff')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Diff
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'terminal'}
              onClick={() => setActiveTab('terminal')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal Logs ({executions.length})
            </button>
          </div>

          {/* File-scoped actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {runtimeAvailable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRunValidation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                Run Tests
              </button>
            )}

            {selectedFile && (
              <>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <a
                  href={`/api/projects/${project.id}/files/download?path=${encodeURIComponent(selectedFile.path)}`}
                  download
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </>
            )}
          </div>
        </div>

        {/* Prompt-Injection Data Containment Warning if present on file */}
        {selectedFile?.promptInjectionWarnings && selectedFile.promptInjectionWarnings.length > 0 && (
          <div
            role="status"
            className="px-4 py-2 bg-amber-950/50 border-b border-amber-800/60 text-xs text-amber-200 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Untrusted Content Guard: Detected prompt-injection pattern ({selectedFile.promptInjectionWarnings.join(', ')}) inside <code className="font-mono">{selectedFile.path}</code>. Treated strictly as passive data; tool permissions unaffected.
            </span>
          </div>
        )}

        {/* Tab 1: Code Editor */}
        {activeTab === 'code' && selectedFile && (
          <div className="flex-1 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 tabular-nums">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-slate-200 font-medium">{selectedFile.path}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedFile.sizeBytes} bytes</span>
                <span aria-hidden="true">·</span>
                <span>Owner: {selectedFile.owner}</span>
                <span aria-hidden="true">·</span>
                <span>Verification: {selectedFile.verificationStatus}</span>
                {isDirty && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400 font-medium">Unsaved changes</span>
                  </>
                )}
              </div>

              {isDirty && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded transition-colors cursor-pointer"
                >
                  Save File Changes
                </button>
              )}
            </div>

            <label htmlFor="workspace-code-textarea" className="sr-only">
              Source code editor for {selectedFile.path}
            </label>
            <textarea
              id="workspace-code-textarea"
              value={draftContent}
              onChange={(e) => {
                setDraftContent(e.target.value);
                setIsDirty(e.target.value !== selectedFile.content);
              }}
              spellCheck={false}
              className="flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-[#0b0f19] text-slate-100 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Tab 2: Unified Diff Viewer */}
        {activeTab === 'diff' && selectedFile && diffResult && (
          <div className="flex-1 flex flex-col min-h-[420px] overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center gap-2 tabular-nums">
              <span className="font-mono text-slate-200">{diffResult.path}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">+{diffResult.additions} additions</span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-400">-{diffResult.deletions} deletions</span>
            </div>
            <div className="p-4 font-mono text-xs space-y-0.5 overflow-x-auto">
              {diffResult.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded-sm ${
                    line.type === 'add'
                      ? 'bg-emerald-950/40 text-emerald-200'
                      : line.type === 'remove'
                      ? 'bg-rose-950/40 text-rose-200'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="w-10 shrink-0 text-right pr-3 text-slate-600 select-none tabular-nums">
                    {line.oldLineNumber ?? ''}
                  </span>
                  <span className="w-10 shrink-0 text-right pr-3 text-slate-600 select-none tabular-nums">
                    {line.newLineNumber ?? ''}
                  </span>
                  <span className="w-4 shrink-0 select-none">
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre">{line.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Live HTML Preview */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col min-h-[420px]">
            {previewHtmlFile ? (
              <>
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
                  <div>
                    <span>Sandboxed HTML5 Runtime Preview</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <code className="text-sky-400">{previewHtmlFile.path}</code>
                  </div>
                  <span className="text-emerald-400">Runtime-checked</span>
                </div>
                <iframe
                  title={`Live Preview of ${project.name}`}
                  srcDoc={previewHtmlFile.content}
                  sandbox="allow-scripts"
                  className="flex-1 w-full bg-slate-950 border-0 min-h-[420px]"
                />
              </>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                No HTML preview entrypoint (<code className="font-mono">public/index.html</code>) exists in this workspace. Run the CLI or unit tests in the Terminal tab.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Terminal & Tool Execution Logs */}
        {activeTab === 'terminal' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-[420px]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Sandboxed Command &amp; Tool Execution Audit Log
                </h3>
                <p className="text-xs text-slate-400">
                  Every command below ran in <code className="font-mono">.letscode-workspaces/{project.id}</code> via policy-gated <code className="font-mono">execFile</code> with secrets redacted.
                </p>
              </div>
              {runtimeAvailable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRunValidation()}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Re-run Test Suite
                </button>
              )}
            </div>

            {executions.length === 0 ? (
              <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
                <p className="font-medium text-slate-300">
                  No runtime commands executed for this project in the container.
                </p>
                <p>
                  Reason: The selected target toolchain ({project.primaryStack}) is not installed in this container environment. Source code and tests were generated and packaged honestly as <strong>Generated (Not Verified)</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => (
                  <div
                    key={exec.tool_call_id}
                    className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2 font-mono text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-400 font-semibold">$ {exec.commandSummary}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 tabular-nums">
                        <span
                          className={
                            exec.status === 'success'
                              ? 'text-emerald-400 font-semibold'
                              : 'text-rose-400 font-semibold'
                          }
                        >
                          {exec.status.toUpperCase()} (exit {exec.exit_code ?? 'N/A'})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{exec.duration_ms}ms</span>
                        <span aria-hidden="true">·</span>
                        <span>Risk: {exec.risk_tier}</span>
                      </div>
                    </div>
                    {exec.stdout && (
                      <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {exec.stdout}
                      </pre>
                    )}
                    {exec.stderr && (
                      <pre className="text-amber-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {exec.stderr}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
