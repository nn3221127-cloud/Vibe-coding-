import React, { useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Play,
  SlidersHorizontal,
  Sparkles,
  Square,
  Wrench,
} from 'lucide-react';
import type { ProjectRecord } from '../types/agent.ts';

interface TaskControlBarProps {
  activeProject: ProjectRecord | null;
  busy: boolean;
  onSubmitTask: (prompt: string, targetPlatform?: string, resolutionChoice?: string) => Promise<void>;
  onCancelTask: () => Promise<void>;
  onSimulateFailure: () => Promise<void>;
  onRepairFailure: () => Promise<void>;
}

const PRESET_PROMPTS: Array<{
  label: string;
  platform: string;
  prompt: string;
}> = [
  {
    label: 'Web + Node.js Sprint Planner',
    platform: 'web',
    prompt:
      'Build a TypeScript sprint capacity and risk priority calculator with strict boundary validation, HTML5 interactive table preview, CLI script, and node:test unit tests.',
  },
  {
    label: 'Python 3 Backlog Service',
    platform: 'python',
    prompt:
      'Build a Python 3 backlog ranker service using dataclasses, ValueError input guards, CLI JSON output, and a unittest verification suite.',
  },
  {
    label: 'Multi-Language (TS + Python)',
    platform: 'multi',
    prompt:
      'Create a multi-language engineering metrics system combining a TypeScript core module with a Python 3 normalization companion service and unit tests for both runtimes.',
  },
  {
    label: 'Rust Crate (Unverified Runtime)',
    platform: 'rust',
    prompt:
      'Generate a Rust 2021 edition library crate for task priority scoring with Cargo.toml, src/lib.rs, and integration tests, demonstrating honest Not Verified runtime status.',
  },
  {
    label: 'Test Contradiction Detector',
    platform: 'cli',
    prompt:
      'Build a strictly offline CLI tool with zero network access that streams live OpenAI API responses in real time.',
  },
];

export const TaskControlBar: React.FC<TaskControlBarProps> = ({
  activeProject,
  busy,
  onSubmitTask,
  onCancelTask,
  onSimulateFailure,
  onRepairFailure,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [showConstraints, setShowConstraints] = useState(false);

  const activeRun = activeProject?.activeTaskRun || null;
  const activeConflict = activeRun?.conflict?.detected ? activeRun.conflict : null;
  const isRepairNeeded =
    activeRun?.stage === 'REPAIRING' ||
    activeRun?.verifications[0]?.status === 'fail';
  const canSimulateFailure =
    activeProject &&
    (activeProject.targetPlatform === 'web' ||
      activeProject.targetPlatform === 'cli' ||
      activeProject.targetPlatform === 'python' ||
      activeProject.targetPlatform === 'multi');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    await onSubmitTask(trimmed, selectedPlatform || undefined);
  };

  const handlePresetClick = (preset: { label: string; platform: string; prompt: string }) => {
    setPrompt(preset.prompt);
    setSelectedPlatform(preset.platform);
  };

  const handleResolveConflict = async (choice: string) => {
    if (!activeRun || busy) return;
    await onSubmitTask(activeRun.prompt, selectedPlatform || activeProject?.targetPlatform, choice);
  };

  return (
    <section
      aria-label="Autonomous Agent Task Control"
      className="border-b border-slate-800 bg-[#0f172a] p-4 space-y-3"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-1 min-w-0">
            <label htmlFor="agent-task-prompt" className="sr-only">
              Describe what you want Let&apos;s Code to build, modify, or verify
            </label>
            <input
              id="agent-task-prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a software project, feature, refactor, or bug fix in plain language..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowConstraints((prev) => !prev)}
              aria-expanded={showConstraints}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              Stack Options
            </button>

            <button
              type="submit"
              disabled={busy || !prompt.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {busy ? 'Running Agent Loop...' : 'Run Autonomous Build'}
            </button>

            {busy && (
              <button
                type="button"
                onClick={onCancelTask}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Collapsible structured stack & constraint fields */}
        {showConstraints && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div>
              <label htmlFor="target-platform-select" className="block text-slate-400 mb-1 font-medium">
                Target Platform / Stack
              </label>
              <select
                id="target-platform-select"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Auto-select from request</option>
                <option value="web">Web App (TypeScript + HTML5 + node:test)</option>
                <option value="cli">CLI Tool (Node.js 22 + node:test)</option>
                <option value="python">Python 3 Service (stdlib + unittest)</option>
                <option value="multi">Multi-Language (TypeScript + Python 3)</option>
                <option value="game">2D Game Prototype (HTML5 Canvas + TS)</option>
                <option value="rust">Rust Crate (Generated only — Not Verified)</option>
                <option value="android">Android Kotlin (Generated only — Not Verified)</option>
              </select>
            </div>
            <div>
              <span className="block text-slate-400 mb-1 font-medium">Sandbox Execution Policy</span>
              <p className="text-slate-300 leading-relaxed">
                Scoped workspace confinement · Argument-array <code className="text-sky-400">execFile</code> · Network disabled · Secrets stripped
              </p>
            </div>
            <div>
              <span className="block text-slate-400 mb-1 font-medium">Repair Loop Budget</span>
              <p className="text-slate-300 leading-relaxed tabular-nums">
                Max 3 evidence-based repair attempts per failure · 8,000ms command timeout
              </p>
            </div>
          </div>
        )}
      </form>

      {/* Quick Prompt Templates & Controlled Failure/Repair Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 inline-flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Try prompt:
          </span>
          {PRESET_PROMPTS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Controlled Failure Diagnosis & Repair demonstration buttons */}
        {canSimulateFailure && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onSimulateFailure}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Bug className="w-3.5 h-3.5" />
              Inject Controlled Test Failure
            </button>

            <button
              type="button"
              disabled={busy || !isRepairNeeded}
              onClick={onRepairFailure}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                isRepairNeeded
                  ? 'text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border-emerald-400 font-semibold'
                  : 'text-emerald-300 bg-emerald-950/30 border-emerald-800/50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Run Evidence-Based Repair
            </button>
          </div>
        )}
      </div>

      {/* Blocking Contradiction Resolution Banner (when stage === WAITING_FOR_REQUIRED_INPUT) */}
      {activeConflict && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-amber-950/40 border border-amber-700/70 text-amber-100 space-y-2.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Specification Contradiction Detected — Waiting for Required Input</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">{activeConflict.summary}</p>
          <p className="text-xs font-medium text-white">{activeConflict.clarifyingQuestion}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {activeConflict.reversibleOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={busy}
                onClick={() => handleResolveConflict(opt)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md transition-colors cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
