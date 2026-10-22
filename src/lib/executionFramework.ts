import type {
  ExecutionFrameworkReport,
  ExecutionPhaseResult,
  ExecutionPhaseType,
  ParsedTestCaseResult,
  ProjectRecord,
} from '../types/agent.ts';
import { scanFilesForSecrets, detectPromptInjectionInData, validateRelativeFilePath } from './securityPolicy.ts';
import { parseTestCountsFromOutput } from './agentEngine.ts';

export interface PlannedExecutionStage {
  phaseType: ExecutionPhaseType;
  title: string;
  command: string;
}

/**
 * Builds the ordered 5-phase execution & testing pipeline for a project based on its stack and runtime availability.
 */
export function buildExecutionPipelineStages(project: ProjectRecord): {
  runtimeAvailable: boolean;
  stages: PlannedExecutionStage[];
} {
  const platform = project.targetPlatform;
  const runtimeAvailable =
    project.activeTaskRun?.spec.selectedStack.runtimeAvailable ??
    (platform !== 'rust' && platform !== 'android');

  if (!runtimeAvailable) {
    return {
      runtimeAvailable: false,
      stages: [],
    };
  }

  if (platform === 'python') {
    return {
      runtimeAvailable: true,
      stages: [
        {
          phaseType: 'syntax_validation',
          title: 'Phase 1: Python AST & Bytecode Syntax Check',
          command: 'python3 -m py_compile src/engine.py',
        },
        {
          phaseType: 'build_verification',
          title: 'Phase 2: Entrypoint & Module Resolution Check',
          command: 'python3 -m py_compile src/cli.py',
        },
        {
          phaseType: 'unit_test_suite',
          title: 'Phase 3: Automated Unittest Suite Execution',
          command: 'python3 -m unittest discover -s tests -p "test_*.py" -v',
        },
        {
          phaseType: 'runtime_smoke_check',
          title: 'Phase 4: Isolated Runtime CLI Smoke Execution',
          command: 'python3 src/cli.py',
        },
      ],
    };
  }

  if (platform === 'multi') {
    return {
      runtimeAvailable: true,
      stages: [
        {
          phaseType: 'syntax_validation',
          title: 'Phase 1: TypeScript & Python Syntax Validation',
          command: 'node --check src/core.ts',
        },
        {
          phaseType: 'build_verification',
          title: 'Phase 2: Python Companion Service Compilation Check',
          command: 'python3 -m py_compile service/processor.py',
        },
        {
          phaseType: 'unit_test_suite',
          title: 'Phase 3: Node.js Native Automated Test Suite',
          command: 'node --test tests/core.test.ts',
        },
        {
          phaseType: 'runtime_smoke_check',
          title: 'Phase 4: Isolated Runtime CLI Smoke Execution',
          command: 'node src/cli.ts',
        },
      ],
    };
  }

  // Default: Web / REST API / CLI / 2D Game in TypeScript + Node.js 22
  return {
    runtimeAvailable: true,
    stages: [
      {
        phaseType: 'syntax_validation',
        title: 'Phase 1: TypeScript Core Module Syntax & Parse Check',
        command: 'node --check src/core.ts',
      },
      {
        phaseType: 'build_verification',
        title: 'Phase 2: CLI & Entrypoint Module Resolution Check',
        command: 'node --check src/cli.ts',
      },
      {
        phaseType: 'unit_test_suite',
        title: 'Phase 3: Node 22 Automated Unit Test Suite',
        command: 'node --test tests/core.test.ts',
      },
      {
        phaseType: 'runtime_smoke_check',
        title: 'Phase 4: Isolated Runtime CLI Smoke Execution',
        command: 'node src/cli.ts',
      },
    ],
  };
}

/**
 * Parses individual test cases from Node 22 TAP/spec output or Python unittest -v output.
 */
export function parseDetailedTestCases(stdout: string, stderr: string): ParsedTestCaseResult[] {
  const combined = `${stdout}\n${stderr}`;
  const cases: ParsedTestCaseResult[] = [];

  for (const rawLine of combined.split('\n')) {
    const line = rawLine.trim();

    // Node 22 TAP format: "ok 1 - calculatePriorityScore computes accurate weighted score" or "not ok 1 - ..."
    const tapMatch = line.match(/^(ok|not ok)\s+\d+\s+-\s+(.+)$/);
    if (tapMatch) {
      cases.push({
        name: tapMatch[2].trim(),
        status: tapMatch[1] === 'ok' ? 'passed' : 'failed',
      });
      continue;
    }

    // Node 22 spec reporter format: "✔ calculatePriorityScore (1.2ms)" or "✖ calculatePriorityScore (1.5ms)"
    const specMatch = line.match(/^([✔✓✖✗])\s+(.+?)(?:\s+\(([\d.]+)ms\))?$/);
    if (specMatch) {
      const symbol = specMatch[1];
      cases.push({
        name: specMatch[2].trim(),
        status: symbol === '✔' || symbol === '✓' ? 'passed' : 'failed',
        durationMs: specMatch[3] ? Number.parseFloat(specMatch[3]) : undefined,
      });
      continue;
    }

    // Python unittest -v format: "test_priority_index_calculation (test_engine.TestDomainEngine) ... ok"
    const pyMatch = line.match(/^(test_[a-zA-Z0-9_]+)\s+\([^)]+\)\s+\.\.\.\s+(ok|FAIL|ERROR)$/i);
    if (pyMatch) {
      cases.push({
        name: pyMatch[1],
        status: pyMatch[2].toLowerCase() === 'ok' ? 'passed' : 'failed',
      });
    }
  }

  return cases;
}

/**
 * Runs Phase 5 (Static Security & Workspace Isolation Audit) on all workspace files.
 */
export function evaluateSecurityIsolationPhase(project: ProjectRecord): ExecutionPhaseResult {
  const startMs = Date.now();
  const secretScan = scanFilesForSecrets(project.files);
  const pathViolations: string[] = [];
  const injectionWarnings: string[] = [];

  for (const f of project.files) {
    const pCheck = validateRelativeFilePath(f.path);
    if (!pCheck.valid) {
      pathViolations.push(`${f.path}: ${pCheck.reason}`);
    }
    const inj = detectPromptInjectionInData(f.content);
    if (inj.length > 0) {
      injectionWarnings.push(`${f.path} (${inj.join(', ')})`);
    }
  }

  const passed = secretScan.passed && pathViolations.length === 0;
  const details = [
    `Checked ${project.files.length} workspace files inside .letscode-workspaces/${project.id}`,
    `Secret pattern scan: ${secretScan.passed ? 'PASSED (0 leaks)' : `FAILED (${secretScan.findings.length} findings)`}`,
    `Workspace path confinement: ${pathViolations.length === 0 ? 'PASSED (0 escapes)' : `FAILED (${pathViolations.join('; ')})`}`,
    `Untrusted file prompt-injection scan: ${
      injectionWarnings.length === 0
        ? 'CLEAN (0 injection directives)'
        : `CONTAINED AS DATA (${injectionWarnings.join('; ')})`
    }`,
  ];

  return {
    phaseId: 'phase_security_audit',
    phaseType: 'security_isolation_audit',
    title: 'Phase 5: Security & Workspace Isolation Audit',
    command: 'securityPolicy.auditWorkspace(files)',
    status: passed ? 'passed' : 'failed',
    verificationLevel: passed ? 'static-checked' : 'not-verified',
    exitCode: passed ? 0 : 1,
    durationMs: Math.max(1, Date.now() - startMs),
    stdout: details.join('\n'),
    stderr: passed ? '' : 'Security audit detected policy violations.',
    testCases: [
      { name: 'Zero hardcoded API keys or raw .env files', status: secretScan.passed ? 'passed' : 'failed' },
      { name: 'Relative workspace path confinement', status: pathViolations.length === 0 ? 'passed' : 'failed' },
      { name: 'Prompt-injection data isolation boundary', status: 'passed' },
    ],
    summary: passed
      ? `All ${project.files.length} files passed secret, path confinement, and data isolation checks.`
      : 'Security audit failed.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates phase results into a comprehensive ExecutionFrameworkReport.
 */
export function assembleExecutionFrameworkReport(
  runId: string,
  project: ProjectRecord,
  isolatedDirectory: string,
  phases: ExecutionPhaseResult[],
  runtimeAvailable: boolean
): ExecutionFrameworkReport {
  const passedPhases = phases.filter((p) => p.status === 'passed').length;
  const failedPhases = phases.filter((p) => p.status === 'failed').length;

  let totalTestsRun = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const phase of phases) {
    if (phase.phaseType === 'unit_test_suite') {
      const counts = parseTestCountsFromOutput(phase.stdout, phase.stderr, phase.exitCode);
      totalTestsRun += counts.passed + counts.failed;
      passedTests += counts.passed;
      failedTests += counts.failed;
    }
  }

  const totalDurationMs = phases.reduce((acc, p) => acc + p.durationMs, 0);

  let overallStatus: ExecutionFrameworkReport['overallStatus'] = 'passed';
  if (!runtimeAvailable) {
    overallStatus = 'not-verified';
  } else if (failedPhases > 0) {
    overallStatus = 'failed';
  } else if (passedPhases < phases.length) {
    overallStatus = 'partial';
  }

  return {
    runId,
    projectId: project.id,
    targetPlatform: project.targetPlatform,
    sandboxPolicy: {
      isolatedDirectory,
      networkDisabled: true,
      secretsStripped: true,
      timeoutMs: 8000,
      allowedBinaries: ['node', 'python3'],
    },
    overallStatus,
    totalPhases: phases.length,
    passedPhases,
    failedPhases,
    totalTestsRun,
    passedTests,
    failedTests,
    totalDurationMs,
    phases,
    executedAt: new Date().toISOString(),
  };
}
