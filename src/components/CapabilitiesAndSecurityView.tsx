import React, { useState } from 'react';
import { Check, Cpu, RefreshCw, ShieldCheck, X } from 'lucide-react';
import type { RuntimeCapabilityRecord } from '../types/agent.ts';

interface CapabilitiesAndSecurityViewProps {
  capabilities: RuntimeCapabilityRecord[];
  modelProvider: {
    providerId: string;
    modelName: string;
    liveApiConfigured: boolean;
    maxContextTokens: number;
  } | null;
  onReprobeCapabilities: () => Promise<void>;
  busy: boolean;
}

interface SecurityCheckAudit {
  id: string;
  name: string;
  input: string;
  outcome: string;
  detail?: string;
}

export const CapabilitiesAndSecurityView: React.FC<CapabilitiesAndSecurityViewProps> = ({
  capabilities,
  modelProvider,
  onReprobeCapabilities,
  busy,
}) => {
  const [securityResults, setSecurityResults] = useState<SecurityCheckAudit[] | null>(null);
  const [runningSecAudit, setRunningSecAudit] = useState(false);

  const handleRunSecurityAudit = async () => {
    setRunningSecAudit(true);
    try {
      const res = await fetch('/api/security/verify-boundaries', { method: 'POST' });
      const data = await res.json();
      if (Array.isArray(data.checks)) {
        setSecurityResults(data.checks);
      }
    } finally {
      setRunningSecAudit(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Section 1: Runtime & Toolchain Capability Matrix */}
      <section aria-label="Environment Capability Registry" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              01. Live Host Environment Capability Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Let&apos;s Code probes installed compilers and interpreters directly and separates code generation from runtime execution.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onReprobeCapabilities}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-Probe Toolchains
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Language / Toolchain</th>
                <th className="py-2.5 px-3 font-medium">Probe Command &amp; Output</th>
                <th className="py-2.5 px-3 font-medium text-center">Generate</th>
                <th className="py-2.5 px-3 font-medium text-center">Parse/Lint</th>
                <th className="py-2.5 px-3 font-medium text-center">Build</th>
                <th className="py-2.5 px-3 font-medium text-center">Test</th>
                <th className="py-2.5 px-3 font-medium text-center">Preview</th>
                <th className="py-2.5 px-3 font-medium text-center">Package</th>
                <th className="py-2.5 px-3 font-medium">Sandbox &amp; Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {capabilities.map((cap) => (
                <tr key={cap.id} className="hover:bg-slate-900/40 align-top">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-100">{cap.language}</div>
                    <div className="text-slate-400 font-mono mt-0.5">{cap.version}</div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="text-sky-400">$ {cap.probeCommand}</div>
                    <div className="text-slate-400 mt-0.5">{cap.probeOutput}</div>
                  </td>
                  {(
                    [
                      ['generate', cap.capabilities.generate],
                      ['parse_or_lint', cap.capabilities.parse_or_lint],
                      ['build', cap.capabilities.build],
                      ['test', cap.capabilities.test],
                      ['preview', cap.capabilities.preview],
                      ['package', cap.capabilities.package],
                    ] as const
                  ).map(([key, supported]) => (
                    <td key={key} className="py-3 px-3 text-center">
                      {supported ? (
                        <span className="inline-flex items-center justify-center text-emerald-400" title="Supported">
                          <Check className="w-4 h-4" />
                          <span className="sr-only">Supported</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center text-slate-600" title="Unavailable">
                          <X className="w-4 h-4" />
                          <span className="sr-only">Unavailable</span>
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-slate-400 max-w-xs space-y-1">
                    <div className="text-slate-300 font-medium">{cap.sandboxIsolationLevel}</div>
                    {cap.knownLimitations.map((lim, i) => (
                      <div key={i} className="text-slate-400 leading-relaxed">
                        {lim}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Model Provider Adapter Status */}
      {modelProvider && (
        <section aria-label="Model Provider Adapter Configuration" className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            02. Server-Side Model Provider Adapter
          </h2>
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>Active Provider Adapter: {modelProvider.providerId}</span>
              </div>
              <p className="text-slate-400">
                All model interactions occur exclusively on the server via <code className="font-mono">@google/genai</code> with structured schema validation and resilient deterministic fallback. API keys are never exposed to browser bundles or logs.
              </p>
            </div>
            <div className="font-mono text-slate-300 tabular-nums">
              Context Limit: {modelProvider.maxContextTokens.toLocaleString()} tokens
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Interactive Security Boundary & Threat Model Verification */}
      <section aria-label="Security Boundary Verification Suite" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              03. Security Policy &amp; Threat Model Verification Suite
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live verification checks against workspace path isolation, secret scanning, untrusted file prompt-injection containment, and command allowlisting.
            </p>
          </div>
          <button
            type="button"
            disabled={runningSecAudit}
            onClick={handleRunSecurityAudit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {runningSecAudit ? 'Running Security Checks...' : 'Run Security Boundary Self-Test'}
          </button>
        </div>

        {securityResults ? (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Check ID</th>
                  <th className="py-2.5 px-3 font-medium">Security Control</th>
                  <th className="py-2.5 px-3 font-medium">Adversarial Test Vector</th>
                  <th className="py-2.5 px-3 font-medium">Gate Outcome</th>
                  <th className="py-2.5 px-3 font-medium">Diagnostic Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {securityResults.map((chk) => (
                  <tr key={chk.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-semibold text-sky-400">{chk.id}</td>
                    <td className="py-3 px-3 font-medium text-slate-200">{chk.name}</td>
                    <td className="py-3 px-3 font-mono text-amber-300">{chk.input}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-emerald-400">{chk.outcome}</td>
                    <td className="py-3 px-3 text-slate-400">{chk.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-400">
            Click <strong>Run Security Boundary Self-Test</strong> above to test adversarial vectors (<code className="font-mono">../../etc/passwd</code>, raw <code className="font-mono">.env</code> files, embedded prompt injections, and unauthorized shell commands) against the live policy gate.
          </div>
        )}
      </section>
    </div>
  );
};
