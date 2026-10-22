# Let's Code — Autonomous AI Software Engineering Workbench

**Let's Code** is an AI-powered software-building agent and engineering workbench that converts natural-language requirements into structured specifications, dependency-aware implementation plans, multi-file codebases, real sandboxed test runs, and portable project archives.

## 1. Core Engineering Loop

`Understand → Specify → Plan → Self-Review Plan → Implement → Run → Test → Diagnose → Repair → Verify → Package → Explain`

## 2. Architecture & Key Modules

- **`server.ts`**: Full-stack Express + Vite server providing:
  - Live host capability probing (`node -v`, `python3 --version`, `git --version`, `rustc --version`, `gradle --version`).
  - Scoped per-project workspace storage (`.letscode-workspaces/<projectId>/`).
  - Policy-gated sandboxed command execution using `child_process.execFile` (argument arrays, stripped secret environment variables, 8,000ms timeouts, output truncation, and secret redaction).
  - Controlled test failure injection and bounded evidence-based repair loop.
  - Standards-compliant PKZIP archive generation and SHA-256 manifest verification.
- **`src/types/agent.ts`**: Typed contracts for task state machine (`RECEIVED` through `COMPLETED`), requirement ledger, plan task graph, tool execution envelopes, verification statuses (`generated`, `static-checked`, `built`, `tested`, `runtime-checked`, `not-verified`), and artifacts.
- **`src/lib/securityPolicy.ts`**: Path traversal guard (`resolveSafeWorkspacePath`, `validateRelativeFilePath`), secret scanner & log redactor (`redactSecrets`, `scanFilesForSecrets`), untrusted project file prompt-injection detector (`detectPromptInjectionInData`), and command allowlist gate (`validateCommandPolicy`).
- **`src/lib/agentEngine.ts`**: Pure state machine, contradiction detector (`detectRequirementConflicts`), structured spec extractor, dependency-aware task planner, plan self-reviewer, unified line-by-line diff engine, and failure diagnoser.
- **`src/lib/zipBuilder.ts`**: Pure TypeScript/Node PKZIP builder and central-directory verifier (`createSafeProjectZip`, `verifyZipArchiveBuffer`).
- **`src/server/modelAdapter.ts`**: Server-side `@google/genai` model adapter (`gemini-3.8-flash`) with structured output validation and automatic resilient fallback to deterministic multi-language project synthesis when no live API key is configured.
- **`src/lib/agentEngine.test.ts`**: Automated unit test suite built on Node 22's native `node:test` runner.

## 3. Setup, Execution & Verification Commands

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`. Keep `GEMINI_API_KEY` server-side only:
```bash
cp .env.example .env
```

### Run Unit Tests
```bash
npm test
# or directly:
node --test src/lib/agentEngine.test.ts
```

### Type-Check & Build Production Bundle
```bash
npm run lint
npm run build
```

### Start Full-Stack Development / Production Server (Port 3000)
```bash
npm run dev
```

## 4. Known Runtime Boundaries

- **Supported for Generation + Sandboxed Build & Test Execution**: TypeScript / JavaScript (`node --check`, `node --test` on Node.js v22.23.3) and Python 3 (`python3 -m py_compile`, `python3 -m unittest` on Python 3.10.12).
- **Supported for Generation + Packaging Only (`Not Verified` at runtime in this container)**: Rust (`cargo`/`rustc` not installed in container) and Android Kotlin (`gradle`/Android SDK not installed in container). Let's Code generates complete manifests, source files, and test suites and explicitly marks runtime execution as `Not verified`.
