import React from 'react';
import { CheckCircle2, ClipboardList, GitBranch, Layers, ShieldCheck } from 'lucide-react';
import type { ProjectRecord } from '../types/agent.ts';

interface SpecAndPlanViewProps {
  project: ProjectRecord;
}

export const SpecAndPlanView: React.FC<SpecAndPlanViewProps> = ({ project }) => {
  const run = project.activeTaskRun;

  if (!run) {
    return (
      <div className="p-8 text-sm text-slate-400">
        No task specification has been generated for this project yet. Submit a prompt above to start the autonomous engineering loop.
      </div>
    );
  }

  const { spec, plan, planReview, stageHistory, repairHistory } = run;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Section 1: Requirement Summary & Architecture Selection */}
      <section aria-label="Requirement Specification Summary" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              01. Structured Requirement Specification
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Model Provider Adapter: <span className="text-sky-400 font-mono">{run.modelProviderUsed}</span>
            </p>
          </div>
          <div className="text-xs text-slate-400 tabular-nums">
            <span>Target: {spec.targetPlatform.toUpperCase()}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Stack: {spec.selectedStack.language}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className={spec.selectedStack.runtimeAvailable ? 'text-emerald-400' : 'text-amber-400'}>
              {spec.selectedStack.runtimeAvailable ? 'Runtime Verified in Sandbox' : 'Generated Only (Runtime Not Installed)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Product Objective &amp; Rationale</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{spec.objective}</p>
            <p className="text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              {spec.selectedStack.rationale}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ClipboardList className="w-4 h-4 text-sky-400" />
              <span>Assumptions &amp; Reversible Defaults</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside leading-relaxed">
              {spec.assumptionsAndDefaults.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Dependencies &amp; Runtime Boundaries</span>
            </div>
            <div className="text-slate-300 font-mono">
              {spec.dependencies.join(' · ')}
            </div>
            <ul className="space-y-1 text-slate-400 list-disc list-inside leading-relaxed pt-1 border-t border-slate-800/80">
              {spec.knownRisksAndUnverified.map((risk, i) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Traceable Requirements Ledger */}
      <section aria-label="Requirements Ledger" className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          02. Traceable Requirements Ledger &amp; Acceptance Criteria
        </h2>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Req ID</th>
                <th className="py-2.5 px-3 font-medium">Requirement &amp; Observable Acceptance Criteria</th>
                <th className="py-2.5 px-3 font-medium">Priority / Source</th>
                <th className="py-2.5 px-3 font-medium">Validation Method</th>
                <th className="py-2.5 px-3 font-medium">Verification Status</th>
                <th className="py-2.5 px-3 font-medium">Evidence Refs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {spec.requirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-900/40 align-top">
                  <td className="py-3 px-3 font-mono font-semibold text-sky-400 whitespace-nowrap">
                    {req.id}
                  </td>
                  <td className="py-3 px-3 space-y-1.5 max-w-md">
                    <div className="font-semibold text-slate-200">{req.title}</div>
                    <p className="text-slate-400 leading-relaxed">{req.description}</p>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5 pt-1">
                      {req.acceptanceCriteria.map((ac, idx) => (
                        <li key={idx}>{ac}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    <span>{req.priority}</span>
                    <span className="mx-1" aria-hidden="true">·</span>
                    <span className="text-slate-400">{req.source}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {req.validationMethod}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`font-mono font-semibold ${
                        req.verificationStatus === 'tested'
                          ? 'text-emerald-400'
                          : req.verificationStatus === 'static-checked' ||
                            req.verificationStatus === 'runtime-checked'
                          ? 'text-sky-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {req.verificationStatus}
                    </span>
                    <span className="mx-1 text-slate-500" aria-hidden="true">·</span>
                    <span className="text-slate-400">{req.status}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {req.evidenceRefs.length > 0 ? req.evidenceRefs.join(', ') : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Dependency-Aware Task Plan & Plan Self-Review */}
      <section aria-label="Dependency-Aware Plan and Self-Review" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            03. Dependency-Aware Implementation Plan &amp; Self-Review
          </h2>
          {planReview && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Plan Self-Review Passed ({planReview.revisionsApplied[0]})</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plan.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono font-semibold text-sky-400">{task.id}</span>
                  <span className="font-semibold text-slate-100">{task.title}</span>
                </div>
                <span className="font-mono text-emerald-400">{task.status}</span>
              </div>

              <p className="text-slate-300 leading-relaxed">{task.implementationApproach}</p>

              <div className="pt-2 border-t border-slate-800/80 text-slate-400 flex flex-wrap items-center gap-2 tabular-nums">
                <span>Satisfies: <code className="text-slate-200">{task.requirementIds.join(', ')}</code></span>
                <span aria-hidden="true">·</span>
                <span>Files: <code className="text-slate-200">{task.files.join(', ')}</code></span>
                <span aria-hidden="true">·</span>
                <span>Risk: {task.risk}</span>
              </div>

              {task.validationCommands.length > 0 && (
                <div className="text-slate-400 font-mono">
                  Checks: <span className="text-sky-300">{task.validationCommands.join(' && ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: State Machine Audit Trail & Repair History */}
      <section aria-label="State Machine History" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            State Machine Transition Audit Trail
          </h3>
          <div className="border border-slate-800 rounded-lg divide-y divide-slate-800/80 bg-slate-900/40 text-xs">
            {stageHistory.map((item, idx) => (
              <div key={idx} className="p-2.5 flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono font-semibold text-sky-400 mr-2">{item.stage}</span>
                  <span className="text-slate-300">{item.note}</span>
                </div>
                <span className="text-slate-500 font-mono shrink-0 tabular-nums">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Evidence-Based Repair Loop History ({repairHistory.length})
          </h3>
          {repairHistory.length === 0 ? (
            <div className="p-4 border border-slate-800 rounded-lg bg-slate-900/40 text-xs text-slate-400">
              Zero repair iterations needed on the initial run. Use the &ldquo;Inject Controlled Test Failure&rdquo; and &ldquo;Run Evidence-Based Repair&rdquo; buttons above to test the diagnosis and repair loop.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg divide-y divide-slate-800/80 bg-slate-900/40 text-xs">
              {repairHistory.map((rep, i) => (
                <div key={i} className="p-3 space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-amber-300 font-semibold">
                      Attempt #{rep.attempt} · {rep.errorCategory}
                    </span>
                    <span className={rep.resolved ? 'text-emerald-400' : 'text-rose-400'}>
                      {rep.resolved ? 'RESOLVED & RETESTED' : 'UNRESOLVED'}
                    </span>
                  </div>
                  <p className="text-slate-300">{rep.hypothesis}</p>
                  <p className="text-slate-400 font-mono">Patched file: {rep.patchedFile}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
