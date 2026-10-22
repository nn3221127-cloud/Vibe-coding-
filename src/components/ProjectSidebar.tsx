import React, { useState } from 'react';
import { FolderCode, History, Plus, RotateCcw, Save } from 'lucide-react';
import type { ProjectRecord } from '../types/agent.ts';
import { calculateHonestProgress } from '../lib/agentEngine.ts';

interface ProjectSidebarProps {
  projects: ProjectRecord[];
  activeProject: ProjectRecord | null;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onCreateCheckpoint: (label: string) => Promise<void>;
  onRestoreCheckpoint: (checkpointId: string) => Promise<void>;
  busy: boolean;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  busy,
}) => {
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || busy) return;
    await onCreateCheckpoint(checkpointLabel.trim() || 'Manual Workspace Snapshot');
    setCheckpointLabel('');
  };

  const activeRun = activeProject?.activeTaskRun || null;
  const progress = activeRun
    ? calculateHonestProgress(activeRun.plan, activeRun.spec.requirements)
    : null;

  return (
    <aside
      aria-label="Projects and Workspace Checkpoints"
      className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0d1321] flex flex-col justify-between"
    >
      {/* Mobile compact toggle bar */}
      <div className="flex lg:hidden items-center justify-between px-4 py-2.5 border-b border-slate-800/80">
        <div className="text-xs font-medium text-slate-300 truncate">
          Project: <span className="text-white font-semibold">{activeProject?.name || 'Select'}</span>
          {activeRun && (
            <span className="ml-2 font-mono text-sky-400">({activeRun.stage})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileExpanded((p) => !p)}
          aria-expanded={mobileExpanded}
          className="px-2.5 py-1 text-xs font-medium text-sky-400 bg-slate-900 border border-slate-800 rounded whitespace-nowrap shrink-0 cursor-pointer"
        >
          {mobileExpanded ? 'Hide Projects' : `Switch Project (${projects.length})`}
        </button>
      </div>

      <div className={`${mobileExpanded ? 'block' : 'hidden'} lg:block p-4 space-y-6`}>
        {/* Section 1: Workspace Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wide">
              Workspace Projects
            </h2>
            <button
              type="button"
              onClick={onOpenNewProjectModal}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="space-y-1.5" role="list" aria-label="Project list">
            {projects.map((proj) => {
              const isSelected = proj.id === activeProject?.id;
              const stage = proj.activeTaskRun?.stage || 'COMPLETED';
              const runtimeAvail =
                proj.activeTaskRun?.spec.selectedStack.runtimeAvailable ?? true;
              const verifiedCount =
                proj.activeTaskRun?.spec.requirements.filter((r) => r.status === 'verified').length ?? 0;
              const totalReqCount = proj.activeTaskRun?.spec.requirements.length ?? 0;

              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(proj.id);
                    setMobileExpanded(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500/60 text-slate-100'
                      : 'bg-transparent border-slate-800/80 text-slate-300 hover:bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderCode className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-sm font-semibold truncate">{proj.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap tabular-nums">
                    <span>{proj.targetPlatform.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{proj.files.length} files</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        stage === 'COMPLETED'
                          ? 'text-emerald-400'
                          : stage === 'REPAIRING' || stage === 'WAITING_FOR_REQUIRED_INPUT'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }
                    >
                      {stage}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    {runtimeAvail
                      ? `${verifiedCount}/${totalReqCount} requirements runtime-verified`
                      : `Generated only (Toolchain not installed)`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Active Task Stage & Honest Progress */}
        {activeRun && progress && (
          <div className="pt-4 border-t border-slate-800/80">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-2">
              Current Lifecycle Stage
            </h2>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">State Machine</span>
                <span className="font-mono font-semibold text-sky-400">{activeRun.stage}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${Math.max(0.05, progress.estimatedPercent / 100)})` }}
                />
              </div>
              <p className="text-xs text-slate-400 tabular-nums leading-relaxed">
                {progress.label}
              </p>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums pt-1 border-t border-slate-800/60">
                <span>Tools: {activeRun.budget.usedToolCalls}/{activeRun.budget.maxToolCalls}</span>
                <span aria-hidden="true">·</span>
                <span>Repairs: {activeRun.budget.usedRepairAttempts}/{activeRun.budget.maxRepairAttempts}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Workspace Checkpoints */}
        {activeProject && (
          <div className="pt-4 border-t border-slate-800/80">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-2">
              Workspace Checkpoints ({activeProject.checkpoints.length})
            </h2>

            <form onSubmit={handleSaveCheckpoint} className="flex gap-1.5 mb-3">
              <label htmlFor="checkpoint-label-input" className="sr-only">
                Checkpoint label
              </label>
              <input
                id="checkpoint-label-input"
                type="text"
                value={checkpointLabel}
                onChange={(e) => setCheckpointLabel(e.target.value)}
                placeholder="Snapshot label..."
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={busy}
                aria-label="Save Workspace Checkpoint"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </form>

            {activeProject.checkpoints.length === 0 ? (
              <p className="text-xs text-slate-500">
                Checkpoints are saved automatically before agent edits or manually above.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeProject.checkpoints.slice(0, 5).map((chk) => (
                  <div
                    key={chk.id}
                    className="flex items-center justify-between gap-2 p-2 rounded border border-slate-800/80 bg-slate-900/40 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="text-slate-300 font-medium truncate">{chk.label}</div>
                      <div className="text-slate-500 tabular-nums">
                        {chk.fileCount} files · {new Date(chk.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRestoreCheckpoint(chk.id)}
                      aria-label={`Restore checkpoint ${chk.label}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-sky-400 hover:text-sky-300 border border-slate-800 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistence disclosure footer */}
      <div className="hidden lg:block p-4 border-t border-slate-800/80 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <History className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Session Persistence Mode</span>
        </div>
        <p className="leading-relaxed">
          Files persist in scoped disk directory <code className="text-slate-400">.letscode-workspaces/</code>. Export a ZIP archive for permanent external storage.
        </p>
      </div>
    </aside>
  );
};
