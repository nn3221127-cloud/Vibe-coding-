export type TaskStage =
  | 'RECEIVED'
  | 'CLASSIFIED'
  | 'INSPECTING'
  | 'SPECIFYING'
  | 'PLANNING'
  | 'PLAN_REVIEW'
  | 'IMPLEMENTING'
  | 'VALIDATING'
  | 'REPAIRING'
  | 'FINAL_REVIEW'
  | 'PACKAGING'
  | 'COMPLETED'
  | 'WAITING_FOR_REQUIRED_INPUT'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';

export type VerificationStatus =
  | 'generated'
  | 'static-checked'
  | 'built'
  | 'tested'
  | 'runtime-checked'
  | 'browser-checked'
  | 'not-verified';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory =
  | 'USER_INPUT_AMBIGUOUS'
  | 'SPEC_CONFLICT'
  | 'UNSUPPORTED_RUNTIME'
  | 'TOOL_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'DEPENDENCY_INSTALL_FAILED'
  | 'BUILD_FAILED'
  | 'TEST_FAILED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMIT'
  | 'INVALID_MODEL_OUTPUT'
  | 'SANDBOX_LIMIT_REACHED'
  | 'ARTIFACT_CREATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'PERSISTENCE_FAILED'
  | 'UNKNOWN_FAILURE';

export interface CapabilityFlags {
  generate: boolean;
  parse_or_lint: boolean;
  build: boolean;
  test: boolean;
  preview: boolean;
  package: boolean;
  deploy: boolean;
}

export interface RuntimeCapabilityRecord {
  id: string;
  language: string;
  version: string;
  osArch: string;
  binaryPath: string;
  packageManager: string;
  buildCommand: string;
  testCommand: string;
  supportedTemplates: string[];
  networkPolicy: string;
  sandboxIsolationLevel: string;
  knownLimitations: string[];
  probeCommand: string;
  probeOutput: string;
  verifiedAt: string;
  capabilities: CapabilityFlags;
}

/**
 * ============================================================================
 * 1. NATURAL LANGUAGE UNDERSTANDING (NLU) MODULE CONTRACTS
 * ============================================================================
 */
export type ProjectArchetype =
  | 'web-app'
  | 'rest-api'
  | 'cli-tool'
  | 'python-service'
  | 'mobile-app'
  | 'game-2d'
  | 'rust-crate'
  | 'multi-service';

export interface ExtractedFeatureEntity {
  id: string;
  name: string;
  category: 'core' | 'ui' | 'data' | 'api' | 'auth' | 'testing' | 'security';
  description: string;
  mandatory: boolean;
  confidence: number;
  sourcePhrase: string;
}

export interface ExtractedTechEntity {
  name: string;
  kind: 'language' | 'framework' | 'runtime' | 'testing' | 'storage';
  role: 'frontend' | 'backend' | 'mobile' | 'cli' | 'service' | 'qa';
  source: 'explicit' | 'inferred';
  versionConstraint?: string;
}

export interface ExtractedDomainModel {
  entityName: string;
  fields: Array<{ name: string; type: string; validationRule: string }>;
  operations: string[];
}

export interface ExtractedConstraintEntity {
  id: string;
  type: 'security' | 'offline' | 'zero-dependency' | 'performance' | 'accessibility' | 'runtime-boundary';
  description: string;
  strictness: 'hard' | 'soft';
}

export interface NluParseResult {
  rawPrompt: string;
  detectedIntent: 'new_project' | 'feature_addition' | 'bug_fix' | 'refactor' | 'tests' | 'security_review' | 'packaging';
  archetype: ProjectArchetype;
  targetPlatform: 'web' | 'cli' | 'api' | 'python' | 'game' | 'android' | 'rust' | 'multi';
  confidenceScore: number;
  features: ExtractedFeatureEntity[];
  technologies: ExtractedTechEntity[];
  domainModels: ExtractedDomainModel[];
  constraints: ExtractedConstraintEntity[];
  ambiguities: string[];
  parsedAt: string;
}

/**
 * ============================================================================
 * 2. PROJECT SCAFFOLDING & GENERATION ENGINE CONTRACTS
 * ============================================================================
 */
export type ScaffoldFileRole = 'domain' | 'entry' | 'api' | 'ui' | 'test' | 'config' | 'docs';

export interface ScaffoldingRequestContract {
  projectName: string;
  projectSlug: string;
  nlu: NluParseResult;
  spec: StructuredSpec;
}

export interface GeneratedScaffoldFile {
  path: string;
  role: ScaffoldFileRole;
  language: string;
  description: string;
  satisfiedFeatureIds: string[];
  satisfiedRequirementIds: string[];
  content: string;
}

export interface ScaffoldingOutputContract {
  templateId: string;
  archetype: ProjectArchetype;
  targetPlatform: StructuredSpec['targetPlatform'];
  primaryLanguage: string;
  framework: string;
  runtimeExecutableInSandbox: boolean;
  directoryTree: string[];
  files: GeneratedScaffoldFile[];
  recommendedCommands: {
    syntaxCheck?: string;
    build?: string;
    test?: string;
    runSmoke?: string;
  };
  generatedAt: string;
}

/**
 * ============================================================================
 * 3. CODE EXECUTION & TESTING FRAMEWORK CONTRACTS
 * ============================================================================
 */
export type ExecutionPhaseType =
  | 'syntax_validation'
  | 'build_verification'
  | 'unit_test_suite'
  | 'runtime_smoke_check'
  | 'security_isolation_audit';

export interface ParsedTestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
}

export interface ExecutionPhaseResult {
  phaseId: string;
  phaseType: ExecutionPhaseType;
  title: string;
  command: string;
  status: 'passed' | 'failed' | 'skipped' | 'blocked' | 'not-supported';
  verificationLevel: VerificationStatus;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  testCases: ParsedTestCaseResult[];
  summary: string;
  timestamp: string;
}

export interface ExecutionFrameworkReport {
  runId: string;
  projectId: string;
  targetPlatform: string;
  sandboxPolicy: {
    isolatedDirectory: string;
    networkDisabled: boolean;
    secretsStripped: boolean;
    timeoutMs: number;
    allowedBinaries: string[];
  };
  overallStatus: 'passed' | 'failed' | 'partial' | 'not-verified';
  totalPhases: number;
  passedPhases: number;
  failedPhases: number;
  totalTestsRun: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  phases: ExecutionPhaseResult[];
  executedAt: string;
}

/**
 * ============================================================================
 * CORE AGENT STATE & WORKSPACE ENTITIES
 * ============================================================================
 */
export interface RequirementRecord {
  id: string;
  title: string;
  description: string;
  priority: 'mandatory' | 'high' | 'medium' | 'optional';
  source: 'user_explicit' | 'uploaded_spec' | 'inferred_default';
  category:
    | 'functional'
    | 'visual'
    | 'performance'
    | 'security'
    | 'accessibility'
    | 'integration'
    | 'compatibility'
    | 'operational';
  acceptanceCriteria: string[];
  plannedTasks: string[];
  validationMethod: string;
  status: 'pending' | 'implemented' | 'verified' | 'blocked' | 'deferred';
  verificationStatus: VerificationStatus;
  evidenceRefs: string[];
  linkedNluFeatureIds?: string[];
}

export interface PlanTaskRecord {
  id: string;
  title: string;
  requirementIds: string[];
  dependsOn: string[];
  files: string[];
  implementationApproach: string;
  validationCommands: string[];
  risk: RiskTier;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  evidenceRefs: string[];
  notes: string[];
}

export interface PlanSelfReviewReport {
  checkedAt: string;
  allMandatoryRequirementsMapped: boolean;
  securityChecksAddressed: boolean;
  environmentCompatible: boolean;
  simplerAlternativeConsidered: boolean;
  revisionsApplied: string[];
  passed: boolean;
}

export interface ToolExecutionEnvelope {
  tool_call_id: string;
  tool: string;
  commandSummary: string;
  status: 'success' | 'error' | 'blocked' | 'timeout';
  risk_tier: RiskTier;
  started_at: string;
  duration_ms: number;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  workspace_id: string;
  warnings: string[];
}

export interface VerificationRecord {
  id: string;
  requirementIds: string[];
  taskId?: string;
  checkType: 'syntax' | 'lint' | 'unit_test' | 'integration_test' | 'build' | 'runtime_preview' | 'security_scan';
  command: string;
  status: 'pass' | 'fail' | 'blocked' | 'not-run';
  verificationLevel: VerificationStatus;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  evidenceSummary: string;
  toolCallId?: string;
  timestamp: string;
}

export interface WorkspaceFile {
  path: string;
  role?: ScaffoldFileRole;
  content: string;
  previousContent: string | null;
  sizeBytes: number;
  sha256: string;
  updatedAt: string;
  status: 'unchanged' | 'created' | 'modified';
  owner: 'agent' | 'user';
  verificationStatus: VerificationStatus;
  promptInjectionWarnings?: string[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface FileDiffResult {
  path: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export interface ArtifactManifest {
  artifactId: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  archiveName: string;
  sizeBytes: number;
  sha256: string;
  files: Array<{
    path: string;
    size_bytes: number;
    sha256: string;
  }>;
  excludedPatterns: string[];
  secretScanPassed: boolean;
  verificationReportPath: string;
}

export interface TaskBudget {
  maxModelCalls: number;
  usedModelCalls: number;
  maxToolCalls: number;
  usedToolCalls: number;
  maxRepairAttempts: number;
  usedRepairAttempts: number;
  maxWallClockMs: number;
  elapsedMs: number;
}

export interface ContradictionConflict {
  detected: boolean;
  category: ErrorCategory | null;
  summary: string;
  conflictingStatements: string[];
  clarifyingQuestion: string;
  reversibleOptions: string[];
}

export interface StructuredSpec {
  objective: string;
  targetUsers: string[];
  targetPlatform: 'web' | 'cli' | 'api' | 'python' | 'game' | 'android' | 'rust' | 'multi';
  selectedStack: {
    language: string;
    framework: string;
    runtimeAvailable: boolean;
    rationale: string;
  };
  assumptionsAndDefaults: string[];
  dependencies: string[];
  knownRisksAndUnverified: string[];
  requirements: RequirementRecord[];
  nluAnalysis?: NluParseResult;
  scaffoldMetadata?: Omit<ScaffoldingOutputContract, 'files'>;
}

export interface CheckpointSnapshot {
  id: string;
  createdAt: string;
  label: string;
  stage: TaskStage;
  fileCount: number;
  files: WorkspaceFile[];
}

export interface TaskRun {
  id: string;
  projectId: string;
  prompt: string;
  taskType: 'new_project' | 'feature_addition' | 'bug_fix' | 'refactor' | 'tests' | 'security_review' | 'packaging';
  stage: TaskStage;
  stageHistory: Array<{ stage: TaskStage; timestamp: string; note: string }>;
  modelProviderUsed: string;
  conflict: ContradictionConflict | null;
  nlu: NluParseResult;
  spec: StructuredSpec;
  plan: PlanTaskRecord[];
  planReview: PlanSelfReviewReport | null;
  executionReport?: ExecutionFrameworkReport;
  toolExecutions: ToolExecutionEnvelope[];
  verifications: VerificationRecord[];
  budget: TaskBudget;
  startedAt: string;
  completedAt: string | null;
  outcomeStatus: 'Completed' | 'Partially completed' | 'Blocked' | 'In progress' | 'Cancelled';
  blockerReason?: string;
  repairHistory: Array<{
    attempt: number;
    errorCategory: ErrorCategory;
    hypothesis: string;
    patchedFile: string;
    resolved: boolean;
    timestamp: string;
  }>;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  targetPlatform: 'web' | 'cli' | 'api' | 'python' | 'game' | 'android' | 'rust' | 'multi';
  primaryStack: string;
  createdAt: string;
  updatedAt: string;
  files: WorkspaceFile[];
  activeTaskRun: TaskRun | null;
  taskHistory: TaskRun[];
  checkpoints: CheckpointSnapshot[];
  artifacts: ArtifactManifest[];
}
