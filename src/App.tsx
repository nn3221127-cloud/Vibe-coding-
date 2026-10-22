import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ProjectRecord, RuntimeCapabilityRecord } from './types/agent.ts';
import { ProjectSidebar } from './components/ProjectSidebar.tsx';
import { TaskControlBar } from './components/TaskControlBar.tsx';
import { WorkspacePanel } from './components/WorkspacePanel.tsx';
import { SpecAndPlanView } from './components/SpecAndPlanView.tsx';
import { CapabilitiesAndSecurityView } from './components/CapabilitiesAndSecurityView.tsx';
import { DeliverablesView } from './components/DeliverablesView.tsx';

export default function App() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [capabilities, setCapabilities] = useState<RuntimeCapabilityRecord[]>([]);
  const [modelProvider, setModelProvider] = useState<{
    providerId: string;
    modelName: string;
    liveApiConfigured: boolean;
    maxContextTokens: number;
  } | null>(null);
  const [activeNavView, setActiveNavView] = useState<
    'workbench' | 'spec' | 'capabilities' | 'deliverables'
  >('workbench');
  const [busy, setBusy] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // New Project Modal State
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjPlatform, setNewProjPlatform] = useState<ProjectRecord['targetPlatform']>('web');
  const [newProjPrompt, setNewProjPrompt] = useState<string>('');

  const loadInitialData = async () => {
    setBusy(true);
    try {
      const [capRes, projRes] = await Promise.all([
        fetch('/api/capabilities'),
        fetch('/api/projects'),
      ]);
      const capData = await capRes.json();
      const projData = await projRes.json();

      if (Array.isArray(capData.capabilities)) {
        setCapabilities(capData.capabilities);
      }
      if (capData.modelProvider) {
        setModelProvider(capData.modelProvider);
      }
      if (Array.isArray(projData.projects) && projData.projects.length > 0) {
        setProjects(projData.projects);
        setActiveProjectId((prev) => prev || projData.projects[0].id);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const updateProjectInList = (updated: ProjectRecord) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((p) => (p.id === updated.id ? updated : p));
    });
    setActiveProjectId(updated.id);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || busy) return;
    setBusy(true);
    setStatusBanner('Creating scoped workspace, extracting requirements, generating code, and running sandbox checks...');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName.trim(),
          targetPlatform: newProjPlatform,
          prompt:
            newProjPrompt.trim() ||
            `Build ${newProjName.trim()} with clean modular architecture, input validation, and automated unit tests.`,
        }),
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        setShowNewModal(false);
        setNewProjName('');
        setNewProjPrompt('');
        setStatusBanner(`Project "${data.project.name}" built and verified (${data.project.activeTaskRun?.stage}).`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitTask = async (
    prompt: string,
    targetPlatform?: string,
    resolutionChoice?: string
  ) => {
    if (!activeProject) return;
    setBusy(true);
    setStatusBanner('Executing Understand → Specify → Plan → Self-Review → Implement → Validate → Package loop...');
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, targetPlatform, resolutionChoice }),
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        const stage = data.project.activeTaskRun?.stage;
        if (stage === 'WAITING_FOR_REQUIRED_INPUT') {
          setStatusBanner('Paused: Contradictory requirements detected. Please select a resolution option below.');
        } else {
          setStatusBanner(`Task run finished with stage ${stage}.`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTask = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.project) {
      updateProjectInList(data.project);
      setStatusBanner('Task cancelled and workspace preserved.');
    }
  };

  const handleSimulateFailure = async () => {
    if (!activeProject) return;
    setBusy(true);
    setStatusBanner('Injecting deterministic defect and executing real sandbox test suite...');
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/simulate-failure`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        setStatusBanner(
          'Test failure captured from sandbox execution (exit code 1). Click "Run Evidence-Based Repair" to diagnose and patch.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRepairFailure = async () => {
    if (!activeProject) return;
    setBusy(true);
    setStatusBanner('Diagnosing failure from stderr evidence, applying narrow patch, and re-running test suite...');
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/repair`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        setStatusBanner('Evidence-based repair succeeded: all unit tests passing in sandbox (exit code 0).');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFile = async (filePath: string, content: string) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save file');
    }
    if (data.project) {
      updateProjectInList(data.project);
      setStatusBanner(`Saved ${filePath} in scoped workspace.`);
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!activeProject) return;
    const res = await fetch(
      `/api/projects/${activeProject.id}/files?path=${encodeURIComponent(filePath)}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (data.project) {
      updateProjectInList(data.project);
      setStatusBanner(`Deleted ${filePath}.`);
    }
  };

  const handleRunValidation = async (command?: string) => {
    if (!activeProject) return;
    setBusy(true);
    setStatusBanner('Running sandboxed verification checks...');
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        const exitCode = data.execution?.exit_code;
        setStatusBanner(
          exitCode === 0
            ? `Sandbox validation passed (${data.execution.commandSummary}).`
            : `Sandbox validation exited with code ${exitCode}. Inspect Terminal & Tool Logs.`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCheckpoint = async (label: string) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    if (data.project) {
      updateProjectInList(data.project);
      setStatusBanner(`Checkpoint "${label}" created.`);
    }
  };

  const handleRestoreCheckpoint = async (checkpointId: string) => {
    if (!activeProject) return;
    const res = await fetch(
      `/api/projects/${activeProject.id}/checkpoints/${checkpointId}/restore`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (data.project) {
      updateProjectInList(data.project);
      setStatusBanner('Workspace restored from checkpoint snapshot.');
    }
  };

  const handleReprobeCapabilities = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/capabilities/probe', { method: 'POST' });
      const data = await res.json();
      if (Array.isArray(data.capabilities)) {
        setCapabilities(data.capabilities);
        setStatusBanner('Runtime capabilities re-probed against host environment.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePackageArtifact = async () => {
    if (!activeProject) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/artifacts`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.project) {
        updateProjectInList(data.project);
        setStatusBanner(`Packaged verified archive ${data.artifact?.archiveName}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Top Navigation Bar: Strict 3-Zone Contract */}
      <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-3.5 border-b border-slate-800 bg-[#0d1321]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#workbench"
          onClick={(e) => {
            e.preventDefault();
            setActiveNavView('workbench');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Let&apos;s Code
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav aria-label="Primary Workbench Views" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="#workbench"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavView('workbench');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNavView === 'workbench' ? 'text-sky-400 underline underline-offset-8' : ''
            }`}
          >
            Workbench
          </a>
          <a
            href="#spec-plan"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavView('spec');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNavView === 'spec' ? 'text-sky-400 underline underline-offset-8' : ''
            }`}
          >
            Spec &amp; Plan
          </a>
          <a
            href="#capabilities"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavView('capabilities');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNavView === 'capabilities' ? 'text-sky-400 underline underline-offset-8' : ''
            }`}
          >
            Capabilities &amp; Security
          </a>
          <a
            href="#deliverables"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavView('deliverables');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNavView === 'deliverables' ? 'text-sky-400 underline underline-offset-8' : ''
            }`}
          >
            Deliverables
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </header>

      {/* Mobile View Switcher Bar (visible on narrow viewports only) */}
      <nav
        aria-label="Mobile Workbench Views"
        className="flex md:hidden items-center justify-between gap-1 px-3 py-2 border-b border-slate-800 bg-[#0f172a] overflow-x-auto"
      >
        {(
          [
            ['workbench', 'Workbench'],
            ['spec', 'Spec & Plan'],
            ['capabilities', 'Capabilities'],
            ['deliverables', 'Deliverables'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveNavView(id)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNavView === id
                ? 'bg-sky-400 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Region 1: Project & Checkpoint Navigation Rail */}
        <ProjectSidebar
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setStatusBanner(null);
          }}
          onOpenNewProjectModal={() => setShowNewModal(true)}
          onCreateCheckpoint={handleCreateCheckpoint}
          onRestoreCheckpoint={handleRestoreCheckpoint}
          busy={busy}
        />

        {/* Region 2 + 3 + 4: Task Control + Active View */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Purpose & Live Status Strip */}
          <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Turn natural-language requirements into structured specifications, dependency-aware plans, verified codebases, and portable ZIP archives.
            </span>
            {statusBanner && (
              <span role="status" className="text-sky-400 font-medium">
                {statusBanner}
              </span>
            )}
          </div>

          {/* Task Input & Autonomous Loop Controls */}
          <TaskControlBar
            activeProject={activeProject}
            busy={busy}
            onSubmitTask={handleSubmitTask}
            onCancelTask={handleCancelTask}
            onSimulateFailure={handleSimulateFailure}
            onRepairFailure={handleRepairFailure}
          />

          {/* Main Active View Content */}
          {activeProject ? (
            <>
              {activeNavView === 'workbench' && (
                <WorkspacePanel
                  project={activeProject}
                  busy={busy}
                  onSaveFile={handleSaveFile}
                  onDeleteFile={handleDeleteFile}
                  onRunValidation={handleRunValidation}
                />
              )}
              {activeNavView === 'spec' && <SpecAndPlanView project={activeProject} />}
              {activeNavView === 'capabilities' && (
                <CapabilitiesAndSecurityView
                  capabilities={capabilities}
                  modelProvider={modelProvider}
                  onReprobeCapabilities={handleReprobeCapabilities}
                  busy={busy}
                />
              )}
              {activeNavView === 'deliverables' && (
                <DeliverablesView
                  project={activeProject}
                  busy={busy}
                  onPackageArtifact={handlePackageArtifact}
                />
              )}
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading project workspace...
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal Dialog */}
      {showNewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0f172a] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="new-project-modal-title" className="text-base font-semibold text-white">
                Create New Software Project
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                aria-label="Close modal"
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label htmlFor="modal-project-name" className="block text-slate-300 font-medium mb-1">
                  Project Name
                </label>
                <input
                  id="modal-project-name"
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Incident Severity & SLA Calculator"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label htmlFor="modal-project-platform" className="block text-slate-300 font-medium mb-1">
                  Target Platform &amp; Toolchain
                </label>
                <select
                  id="modal-project-platform"
                  value={newProjPlatform}
                  onChange={(e) =>
                    setNewProjPlatform(e.target.value as ProjectRecord['targetPlatform'])
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="web">Web App (TypeScript + HTML5 + node:test — Verified Runtime)</option>
                  <option value="cli">Node.js CLI (TypeScript + node:test — Verified Runtime)</option>
                  <option value="python">Python 3 Service (stdlib + unittest — Verified Runtime)</option>
                  <option value="multi">Multi-Language (TypeScript + Python 3 — Verified Runtimes)</option>
                  <option value="game">2D Game Prototype (HTML5 Canvas + TS — Verified Runtime)</option>
                  <option value="rust">Rust 2021 Crate (Cargo — Generated Only / Not Verified)</option>
                  <option value="android">Android Kotlin (Compose — Generated Only / Not Verified)</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-project-prompt" className="block text-slate-300 font-medium mb-1">
                  Natural-Language Requirements &amp; Features
                </label>
                <textarea
                  id="modal-project-prompt"
                  rows={3}
                  value={newProjPrompt}
                  onChange={(e) => setNewProjPrompt(e.target.value)}
                  placeholder="Describe the features, validation rules, and user flows you want Let's Code to build and test..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !newProjName.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Start Autonomous Build
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
