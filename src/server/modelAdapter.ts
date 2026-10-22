import { GoogleGenAI, Type } from '@google/genai';
import type {
  GeneratedScaffoldFile,
  ScaffoldingOutputContract,
  StructuredSpec,
} from '../types/agent.ts';
import { parseNaturalLanguageRequirements } from '../lib/nluParser.ts';
import { generateProjectScaffold } from '../lib/scaffoldingEngine.ts';

export interface ModelCapabilities {
  providerId: string;
  modelName: string;
  liveApiConfigured: boolean;
  maxContextTokens: number;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
}

/**
 * Checks whether a real non-placeholder GEMINI_API_KEY is available on the server.
 */
export function isLiveGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (
    trimmed === '' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_GEMINI_API_KEY' ||
    trimmed.startsWith('PLACEHOLDER')
  ) {
    return false;
  }
  return trimmed.length >= 15;
}

export function getModelCapabilities(preferredModel = 'gemini-3.8-flash'): ModelCapabilities {
  const live = isLiveGeminiKeyConfigured();
  return {
    providerId: live ? `google-genai (${preferredModel})` : 'local-deterministic-adapter (fallback)',
    modelName: preferredModel,
    liveApiConfigured: live,
    maxContextTokens: 1048576,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
  };
}

/**
 * Invokes the Project Scaffolding & Generation Engine (fed by NLU + StructuredSpec)
 * and enriches documentation with the server-side Gemini Model Provider when available.
 */
export async function generateProjectFilesWithAdapter(
  prompt: string,
  projectName: string,
  spec: StructuredSpec,
  preferredModel = 'gemini-3.8-flash'
): Promise<{
  scaffold: ScaffoldingOutputContract;
  files: GeneratedScaffoldFile[];
  providerUsed: string;
}> {
  const nlu = spec.nluAnalysis || parseNaturalLanguageRequirements(prompt, spec.targetPlatform);
  const projectSlug =
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'lets-code-project';

  const scaffold = generateProjectScaffold({
    projectName,
    projectSlug,
    nlu,
    spec,
  });

  if (!isLiveGeminiKeyConfigured()) {
    return {
      scaffold,
      files: scaffold.files,
      providerUsed: 'Deterministic Scaffolding Engine (Server-side fallback — no live API key required)',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6500));

    const genPromise = ai.models.generateContent({
      model: preferredModel,
      contents: [
        `You are the architecture engine for Let's Code. Summarize the architectural highlights and custom domain notes for this project request in JSON:`,
        `Project Name: ${projectName}`,
        `NLU Archetype: ${nlu.archetype} (${spec.selectedStack.language})`,
        `Extracted Features: ${nlu.features.map((f) => f.name).join(', ')}`,
        `User Request: ${prompt}`,
      ].join('\n'),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            architectureSummary: {
              type: Type.STRING,
              description: 'Concise 2-sentence architectural overview tailored to the user request.',
            },
            securityNote: {
              type: Type.STRING,
              description: 'Key security control implemented for this project.',
            },
          },
          required: ['architectureSummary', 'securityNote'],
        },
      },
    });

    const response = await Promise.race([genPromise, timeoutPromise]);
    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim()) as {
        architectureSummary?: string;
        securityNote?: string;
      };
      if (parsed.architectureSummary) {
        const readmeIdx = scaffold.files.findIndex((f) => f.path === 'README.md');
        if (readmeIdx >= 0) {
          scaffold.files[readmeIdx].content += `\n\n## AI Architecture Synthesis (${preferredModel})\n\n${parsed.architectureSummary}\n\n- **Security Note:** ${parsed.securityNote || 'Strict input validation enforced.'}\n`;
        }
      }
      return {
        scaffold,
        files: scaffold.files,
        providerUsed: `Google GenAI (${preferredModel}) + Let's Code Scaffolding Engine`,
      };
    }
  } catch {
    // Graceful fallback on provider timeout/429/invalid key without failing the build
  }

  return {
    scaffold,
    files: scaffold.files,
    providerUsed: 'Deterministic Scaffolding Engine (Resilient fallback)',
  };
}
