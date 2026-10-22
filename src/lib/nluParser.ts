import type {
  ExtractedConstraintEntity,
  ExtractedDomainModel,
  ExtractedFeatureEntity,
  ExtractedTechEntity,
  NluParseResult,
  ProjectArchetype,
  StructuredSpec,
} from '../types/agent.ts';

interface FeaturePattern {
  idPrefix: string;
  name: string;
  category: ExtractedFeatureEntity['category'];
  regex: RegExp;
  description: string;
  mandatory: boolean;
}

const FEATURE_PATTERNS: FeaturePattern[] = [
  {
    idPrefix: 'FEAT-VAL',
    name: 'Boundary Input Validation & Sanitization',
    category: 'security',
    regex: /\b(validat(?:e|ion)|sanitiz(?:e|ation)|boundary|schema|type[- ]safe|valueerror|guard)\b/i,
    description: 'Enforce strict boundary validation and reject malformed inputs before mutating state.',
    mandatory: true,
  },
  {
    idPrefix: 'FEAT-AUTH',
    name: 'Role-Based Access & Credential Protection',
    category: 'auth',
    regex: /\b(auth(?:entication|orization)?|login|rbac|role|jwt|session|token|permission)\b/i,
    description: 'Implement authentication/authorization guards and secure credential handling.',
    mandatory: true,
  },
  {
    idPrefix: 'FEAT-API',
    name: 'Structured REST API Endpoints & JSON Contracts',
    category: 'api',
    regex: /\b(rest\s*api|endpoint|route|webhook|json\s+api|microservice|http|controller|payload)\b/i,
    description: 'Provide typed request/response routing handlers with deterministic status codes and error envelopes.',
    mandatory: true,
  },
  {
    idPrefix: 'FEAT-RANK',
    name: 'Weighted Priority & Capacity Scoring Engine',
    category: 'core',
    regex: /\b(priority|rank(?:er|ing)?|wsjf|capacity|sprint|score|calculator|allocat(?:e|or|ion)|velocity|sla)\b/i,
    description: 'Compute deterministic priority scores and allocate items within capacity constraints.',
    mandatory: true,
  },
  {
    idPrefix: 'FEAT-DATA',
    name: 'Data Aggregation, Filtering & Search',
    category: 'data',
    regex: /\b(filter|search|sort|aggregat(?:e|ion)|pipeline|csv|transform|normalize|analytics|telemetry|metrics)\b/i,
    description: 'Support real-time collection filtering, sorting, and statistical aggregation.',
    mandatory: false,
  },
  {
    idPrefix: 'FEAT-GAME',
    name: 'Deterministic 2D Game Loop & Collision State Machine',
    category: 'core',
    regex: /\b(game|canvas|arcade|player|score|collision|level|physics|2d|paddle|grid)\b/i,
    description: 'Manage frame-independent game state transitions, score increments, and win/loss conditions.',
    mandatory: true,
  },
  {
    idPrefix: 'FEAT-UI',
    name: 'Responsive Interactive Preview & Accessible Controls',
    category: 'ui',
    regex: /\b(ui|interface|dashboard|web\s*app|preview|widget|html5|table|form|responsive|mobile)\b/i,
    description: 'Render an accessible, responsive user interface with interactive state updates.',
    mandatory: false,
  },
  {
    idPrefix: 'FEAT-CLI',
    name: 'Command-Line Runner & Structured Output',
    category: 'core',
    regex: /\b(cli|command[- ]line|terminal|console|script|stdout)\b/i,
    description: 'Provide a runnable CLI entrypoint emitting structured JSON and clear exit codes.',
    mandatory: false,
  },
  {
    idPrefix: 'FEAT-TEST',
    name: 'Automated Unit & Regression Test Suite',
    category: 'testing',
    regex: /\b(unit\s*test|test\s*suite|node:test|unittest|pytest|cargo\s*test|junit|assertion|verify)\b/i,
    description: 'Execute deterministic automated tests covering normal flows, boundaries, and error cases.',
    mandatory: true,
  },
];

interface TechPattern {
  name: string;
  kind: ExtractedTechEntity['kind'];
  role: ExtractedTechEntity['role'];
  regex: RegExp;
  versionConstraint?: string;
}

const TECH_PATTERNS: TechPattern[] = [
  { name: 'TypeScript', kind: 'language', role: 'backend', regex: /\b(typescript|\bts\b)\b/i, versionConstraint: '>=5.0' },
  { name: 'JavaScript (ES2022)', kind: 'language', role: 'frontend', regex: /\b(javascript|\bjs\b|es2022)\b/i },
  { name: 'Node.js', kind: 'runtime', role: 'backend', regex: /\b(node(?:\.js)?|nodejs)\b/i, versionConstraint: '>=22.0.0' },
  { name: 'Python 3', kind: 'language', role: 'service', regex: /\b(python\s*3?|py)\b/i, versionConstraint: '>=3.10' },
  { name: 'Rust', kind: 'language', role: 'cli', regex: /\b(rust|rustc|cargo)\b/i, versionConstraint: '2021 Edition' },
  { name: 'Kotlin', kind: 'language', role: 'mobile', regex: /\b(kotlin|android)\b/i, versionConstraint: '>=1.9' },
  { name: 'Jetpack Compose', kind: 'framework', role: 'mobile', regex: /\b(jetpack\s+compose|compose)\b/i },
  { name: 'HTML5 & CSS3', kind: 'language', role: 'frontend', regex: /\b(html5?|css3?|web|widget|dashboard)\b/i },
  { name: 'HTML5 Canvas 2D', kind: 'framework', role: 'frontend', regex: /\b(canvas|2d\s+game|arcade)\b/i },
  { name: 'FastAPI / REST Router', kind: 'framework', role: 'backend', regex: /\b(fastapi|express|rest\s*api|endpoint)\b/i },
  { name: 'node:test', kind: 'testing', role: 'qa', regex: /\b(node:test|node\s+--test)\b/i, versionConstraint: 'built-in' },
  { name: 'unittest', kind: 'testing', role: 'qa', regex: /\b(unittest|pytest)\b/i, versionConstraint: 'stdlib' },
];

/**
 * Parses a raw natural-language requirement prompt into structured NLU entities:
 * intent, project archetype, target platform, desired features, languages/frameworks,
 * domain models, constraints, and ambiguities.
 */
export function parseNaturalLanguageRequirements(
  prompt: string,
  preferredPlatform?: string,
  hasExistingFiles = false
): NluParseResult {
  const cleanPrompt = (prompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  // 1. Detect Intent
  let detectedIntent: NluParseResult['detectedIntent'] = 'new_project';
  if (/\b(fix|bug|repair|broken|failing|defect)\b/i.test(lower)) {
    detectedIntent = 'bug_fix';
  } else if (/\b(security|audit|vulnerability|threat|penetration)\b/i.test(lower)) {
    detectedIntent = 'security_review';
  } else if (/\b(refactor|clean\s*up|restructure|modularize)\b/i.test(lower)) {
    detectedIntent = 'refactor';
  } else if (hasExistingFiles && /\b(unit\s*test|test\s*suite|coverage)\b/i.test(lower) && !/\bbuild\s+a\b/i.test(lower)) {
    detectedIntent = 'tests';
  } else if (/\b(package|archive|export\s+zip)\b/i.test(lower)) {
    detectedIntent = 'packaging';
  } else if (hasExistingFiles && /\b(add|extend|update|enhance|integrate)\b/i.test(lower)) {
    detectedIntent = 'feature_addition';
  }

  // 2. Determine Target Platform & Archetype
  let targetPlatform: StructuredSpec['targetPlatform'] = 'web';
  let archetype: ProjectArchetype = 'web-app';

  const explicitPref = preferredPlatform?.toLowerCase().trim();
  if (explicitPref === 'python' || (!explicitPref && /\b(python|fastapi|pytest|unittest|dataclass)\b/i.test(lower) && !/\b(typescript|multi[- ]language)\b/i.test(lower))) {
    targetPlatform = 'python';
    archetype = 'python-service';
  } else if (explicitPref === 'rust' || (!explicitPref && /\b(rust|cargo|rustc|crate)\b/i.test(lower))) {
    targetPlatform = 'rust';
    archetype = 'rust-crate';
  } else if (explicitPref === 'android' || (!explicitPref && /\b(android|kotlin|jetpack\s+compose|mobile\s+app)\b/i.test(lower))) {
    targetPlatform = 'android';
    archetype = 'mobile-app';
  } else if (explicitPref === 'multi' || /\b(multi[- ]language|cross[- ]language)\b/i.test(lower) || (/\bpython\b/i.test(lower) && /\b(typescript|node|web)\b/i.test(lower))) {
    targetPlatform = 'multi';
    archetype = 'multi-service';
  } else if (explicitPref === 'game' || (!explicitPref && /\b(game|arcade|canvas\s+2d|breakout|grid\s+runner)\b/i.test(lower))) {
    targetPlatform = 'game';
    archetype = 'game-2d';
  } else if (explicitPref === 'api' || (!explicitPref && /\b(rest\s*api|api\s+service|endpoint|microservice|webhook\s+handler)\b/i.test(lower))) {
    targetPlatform = 'api';
    archetype = 'rest-api';
  } else if (explicitPref === 'cli' || (!explicitPref && /\b(cli|command[- ]line\s+tool|terminal\s+utility)\b/i.test(lower) && !/\b(web\s+app|html5)\b/i.test(lower))) {
    targetPlatform = 'cli';
    archetype = 'cli-tool';
  } else {
    targetPlatform = 'web';
    archetype = 'web-app';
  }

  // 3. Extract Desired Feature Entities
  const features: ExtractedFeatureEntity[] = [];
  let idx = 1;
  for (const pat of FEATURE_PATTERNS) {
    const match = cleanPrompt.match(pat.regex);
    if (match) {
      features.push({
        id: `${pat.idPrefix}-${String(idx++).padStart(2, '0')}`,
        name: pat.name,
        category: pat.category,
        description: pat.description,
        mandatory: pat.mandatory,
        confidence: 0.94,
        sourcePhrase: match[0],
      });
    }
  }

  // Extract custom user-stated action clauses if not already covered
  const customClauses = cleanPrompt
    .split(/[,.;]+|\band\b|\bwith\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= 90);

  if (features.length === 0 && customClauses.length > 0) {
    features.push({
      id: 'FEAT-CUSTOM-01',
      name: customClauses[0].charAt(0).toUpperCase() + customClauses[0].slice(1),
      category: 'core',
      description: `Implement user-specified capability: "${customClauses[0]}".`,
      mandatory: true,
      confidence: 0.88,
      sourcePhrase: customClauses[0],
    });
  }

  // Always ensure core validation and automated testing are present as foundational engineering features
  if (!features.some((f) => f.category === 'security')) {
    features.push({
      id: `FEAT-VAL-${String(idx++).padStart(2, '0')}`,
      name: 'Boundary Input Validation & Sanitization',
      category: 'security',
      description: 'Validate all inputs at module boundaries before state mutation.',
      mandatory: true,
      confidence: 0.9,
      sourcePhrase: 'inferred engineering standard',
    });
  }
  if (!features.some((f) => f.category === 'testing')) {
    features.push({
      id: `FEAT-TEST-${String(idx++).padStart(2, '0')}`,
      name: 'Automated Unit & Regression Test Suite',
      category: 'testing',
      description: 'Verify core calculations, state transitions, and invalid input handling.',
      mandatory: true,
      confidence: 0.92,
      sourcePhrase: 'inferred engineering standard',
    });
  }

  // 4. Extract Technologies (Explicit + Inferred Stack)
  const technologies: ExtractedTechEntity[] = [];
  for (const tech of TECH_PATTERNS) {
    if (tech.regex.test(cleanPrompt)) {
      technologies.push({
        name: tech.name,
        kind: tech.kind,
        role: tech.role,
        source: 'explicit',
        versionConstraint: tech.versionConstraint,
      });
    }
  }

  // Add inferred stack technologies based on selected targetPlatform if not already present
  const addInferredTech = (
    name: string,
    kind: ExtractedTechEntity['kind'],
    role: ExtractedTechEntity['role'],
    versionConstraint?: string
  ) => {
    if (!technologies.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      technologies.push({ name, kind, role, source: 'inferred', versionConstraint });
    }
  };

  if (targetPlatform === 'python') {
    addInferredTech('Python 3', 'language', 'service', '>=3.10');
    addInferredTech('unittest', 'testing', 'qa', 'stdlib');
  } else if (targetPlatform === 'rust') {
    addInferredTech('Rust', 'language', 'cli', '2021 Edition');
    addInferredTech('Cargo', 'framework', 'qa');
  } else if (targetPlatform === 'android') {
    addInferredTech('Kotlin', 'language', 'mobile', '>=1.9');
    addInferredTech('Jetpack Compose', 'framework', 'mobile');
  } else if (targetPlatform === 'multi') {
    addInferredTech('TypeScript', 'language', 'backend', '>=5.0');
    addInferredTech('Python 3', 'language', 'service', '>=3.10');
    addInferredTech('node:test', 'testing', 'qa', 'built-in');
    addInferredTech('unittest', 'testing', 'qa', 'stdlib');
  } else {
    addInferredTech('TypeScript', 'language', 'backend', '>=5.0');
    addInferredTech('Node.js', 'runtime', 'backend', '>=22.0.0');
    addInferredTech('node:test', 'testing', 'qa', 'built-in');
    if (targetPlatform === 'web' || targetPlatform === 'game' || targetPlatform === 'api') {
      addInferredTech('HTML5 & CSS3', 'language', 'frontend');
    }
  }

  // 5. Extract Domain Models
  const domainModels = extractDomainModelsFromPrompt(lower, archetype);

  // 6. Extract Project Constraints
  const constraints: ExtractedConstraintEntity[] = [];
  if (/\b(strictly\s+offline|zero\s+network|no\s+network|air[- ]gapped|offline)\b/i.test(lower)) {
    constraints.push({
      id: 'CONST-OFFLINE',
      type: 'offline',
      description: 'Strictly offline execution with zero external network requests.',
      strictness: 'hard',
    });
  }
  if (/\b(zero[- ]dependency|no\s+external\s+dependencies|stdlib\s+only)\b/i.test(lower)) {
    constraints.push({
      id: 'CONST-ZERODEP',
      type: 'zero-dependency',
      description: 'Use standard library and built-in runtime modules without external packages.',
      strictness: 'hard',
    });
  }
  if (/\b(wcag|accessible|accessibility|keyboard|screen\s+reader|aria)\b/i.test(lower)) {
    constraints.push({
      id: 'CONST-A11Y',
      type: 'accessibility',
      description: 'Keyboard-navigable controls, semantic HTML landmarks, and WCAG AA contrast.',
      strictness: 'soft',
    });
  }
  constraints.push({
    id: 'CONST-SANDBOX',
    type: 'security',
    description: 'Confine all file writes to scoped workspace and strip host secrets from child processes.',
    strictness: 'hard',
  });

  if (targetPlatform === 'rust' || targetPlatform === 'android') {
    constraints.push({
      id: 'CONST-RUNTIME-UNAVAILABLE',
      type: 'runtime-boundary',
      description: `Host container lacks ${targetPlatform.toUpperCase()} compiler/SDK; generate complete code & tests and report runtime status as Not Verified.`,
      strictness: 'hard',
    });
  }

  // 7. Ambiguities & Confidence Score
  const ambiguities: string[] = [];
  if (cleanPrompt.split(/\s+/).length < 5) {
    ambiguities.push(
      'Short user prompt provided; defaulted to modular domain engine + interactive preview + automated unit test suite.'
    );
  }
  if (!preferredPlatform && !/\b(typescript|python|rust|kotlin|android|node|web|cli|api|game)\b/i.test(lower)) {
    ambiguities.push(
      'No explicit programming language named in prompt; defaulted to TypeScript + Node.js 22 for immediate sandbox verification.'
    );
  }

  const confidenceScore = Math.min(
    0.99,
    Math.max(0.72, Math.round((0.82 + (features.length * 0.03) - (ambiguities.length * 0.05)) * 100) / 100)
  );

  return {
    rawPrompt: cleanPrompt,
    detectedIntent,
    archetype,
    targetPlatform,
    confidenceScore,
    features,
    technologies,
    domainModels,
    constraints,
    ambiguities,
    parsedAt: new Date().toISOString(),
  };
}

function extractDomainModelsFromPrompt(
  lower: string,
  archetype: ProjectArchetype
): ExtractedDomainModel[] {
  if (archetype === 'game-2d') {
    return [
      {
        entityName: 'GameWorldState',
        fields: [
          { name: 'playerX', type: 'number', validationRule: '0 <= playerX <= arenaWidth' },
          { name: 'playerY', type: 'number', validationRule: '0 <= playerY <= arenaHeight' },
          { name: 'score', type: 'number', validationRule: 'score >= 0' },
          { name: 'hullIntegrity', type: 'number', validationRule: '0 <= hullIntegrity <= 100' },
          { name: 'status', type: "'playing' | 'victory' | 'game_over'", validationRule: 'valid enum state' },
        ],
        operations: ['stepGameTick', 'movePlayer', 'collectEnergyCell', 'checkWinOrLossCondition'],
      },
    ];
  }

  if (archetype === 'rest-api') {
    return [
      {
        entityName: 'ServiceEndpointRequest',
        fields: [
          { name: 'method', type: "'GET' | 'POST' | 'DELETE'", validationRule: 'supported HTTP verb' },
          { name: 'path', type: 'string', validationRule: 'non-empty route starting with /api/' },
          { name: 'payload', type: 'Record<string, unknown>', validationRule: 'validated schema fields' },
        ],
        operations: ['handleApiRequest', 'validatePayloadSchema', 'listRecords', 'createRecord'],
      },
    ];
  }

  if (lower.includes('incident') || lower.includes('sla') || lower.includes('alert')) {
    return [
      {
        entityName: 'IncidentTicket',
        fields: [
          { name: 'id', type: 'string', validationRule: 'non-empty ticket identifier' },
          { name: 'severityWeight', type: 'number', validationRule: '0 <= severityWeight <= 100' },
          { name: 'responseHours', type: 'number', validationRule: 'responseHours > 0' },
          { name: 'confidence', type: 'number', validationRule: '0.1 <= confidence <= 1.0' },
        ],
        operations: ['validateTaskInput', 'calculatePriorityScore', 'buildSprintAllocation'],
      },
    ];
  }

  return [
    {
      entityName: 'EngineeringTaskItem',
      fields: [
        { name: 'id', type: 'string', validationRule: 'non-empty string' },
        { name: 'title', type: 'string', validationRule: 'non-empty string' },
        { name: 'impactScore', type: 'number', validationRule: '0 <= impactScore <= 100' },
        { name: 'effortHours', type: 'number', validationRule: 'effortHours > 0' },
        { name: 'confidence', type: 'number', validationRule: '0.1 <= confidence <= 1.0' },
      ],
      operations: ['validateTaskInput', 'calculatePriorityScore', 'buildSprintAllocation'],
    },
  ];
}
