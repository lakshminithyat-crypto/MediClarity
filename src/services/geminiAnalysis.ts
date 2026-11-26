import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { AnalysisResult, LanguageCode } from '../types/report';
import { validateAnalysisPayload } from '../utils/reportHelpers';

const ALLOWED_LANGUAGES = new Set<LanguageCode>(['English', 'Telugu', 'Hindi', 'Tamil']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export interface ClientAnalysisInput {
  language: LanguageCode;
  text?: string;
  file?: { mimeType: string; data: string };
  redactionApplied: boolean;
}

export function resolveGeminiApiKey(): string {
  const viteEnvKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;

  let processEnvKey: string | undefined;
  try {
    processEnvKey = process.env.GEMINI_API_KEY;
  } catch {
    processEnvKey = undefined;
  }

  return (viteEnvKey || processEnvKey || '').trim();
}

function buildSystemInstruction(language: LanguageCode): string {
  return [
    'You are MediClarity AI, a compassionate, accurate patient-education assistant that interprets clinical laboratory reports.',
    'Follow these strict rules without exception:',
    '1. Extract EVERY lab test parameter present in the report with its observedValue (number/reading only when clear), unit, referenceRange, and status ("Normal", "Low", or "High").',
    '2. NEVER diagnose a disease, condition, or illness, and NEVER prescribe medications or treatments. Always frame findings educationally (for example: "can sometimes be linked to", "worth reviewing with your doctor").',
    '3. Explain every test result — especially every "Low" or "High" result — in warm, reassuring, 8th-grade plain language without intimidating medical jargon. Briefly state what the test measures in the body and why the observed number is within or outside the typical range.',
    '4. Generate 3 to 4 smart, specific, practical follow-up questions tailored directly to the patient’s actual results (especially any abnormal values) that they can ask their doctor at their appointment.',
    '5. Write a clear, concise 2-sentence plain-language overview in the `summary` field.',
    `6. LANGUAGE REQUIREMENT: Write the entire \`summary\`, every test's \`explanation\`, every test's \`localizedStatus\` (the translation of Normal / Low / High), and every item in \`doctorQuestions\` strictly in ${language}. Keep the \`status\` field strictly one of the exact English strings "Normal", "Low", or "High" for UI color-coding. Keep numeric values and standard clinical units accurate.`,
    '7. PRIVACY: Completely ignore and never repeat any patient personal identifiers (name, phone, email, ID, DOB, or address) in your response.',
  ].join('\n');
}

const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        'Exactly 2 clear plain-language sentences summarizing the overall report in the requested language.',
    },
    tests: {
      type: Type.ARRAY,
      description: 'Every laboratory test extracted from the report.',
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: {
            type: Type.STRING,
            description: 'Name of the lab test parameter (e.g., Hemoglobin, LDL Cholesterol).',
          },
          observedValue: {
            type: Type.STRING,
            description: 'Observed measurement value (e.g., 10.4, 168, 92).',
          },
          unit: {
            type: Type.STRING,
            description: 'Unit of measurement (e.g., g/dL, mg/dL, %).',
          },
          referenceRange: {
            type: Type.STRING,
            description:
              'Clinical reference range printed on the report (e.g., 12.0 - 15.5 g/dL, < 100 mg/dL).',
          },
          status: {
            type: Type.STRING,
            description: 'Must be strictly one of: Normal, Low, High.',
          },
          localizedStatus: {
            type: Type.STRING,
            description:
              'Short status label translated into the requested language (e.g., Normal / Low / High in target language).',
          },
          explanation: {
            type: Type.STRING,
            description:
              'Simple 8th-grade plain-language explanation of what this test measures and what the result means, without diagnosing any disease, in the requested language.',
          },
        },
        required: [
          'parameter',
          'observedValue',
          'unit',
          'referenceRange',
          'status',
          'localizedStatus',
          'explanation',
        ],
      },
    },
    doctorQuestions: {
      type: Type.ARRAY,
      description:
        '3 to 4 specific, actionable follow-up questions the patient should ask their doctor, written in the requested language.',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['summary', 'tests', 'doctorQuestions'],
};

async function callGeminiWithFallback(
  ai: GoogleGenAI,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  language: LanguageCode
) {
  const models: Array<{ name: string; thinkingLevel: ThinkingLevel }> = [
    { name: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { name: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.LOW },
  ];

  let lastError: unknown;

  for (const modelConfig of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model: modelConfig.name,
          contents: { parts },
          config: {
            systemInstruction: buildSystemInstruction(language),
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_RESPONSE_SCHEMA,
            thinkingConfig: {
              thinkingLevel: modelConfig.thinkingLevel,
            },
          },
        });
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        const isTransient =
          message.includes('429') ||
          message.includes('503') ||
          message.includes('UNAVAILABLE') ||
          message.includes('RESOURCE_EXHAUSTED') ||
          message.includes('high demand') ||
          message.includes('Failed to fetch');

        if (!isTransient) {
          throw err;
        }
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }

  throw lastError;
}

export async function analyzeReportClientSide(
  input: ClientAnalysisInput
): Promise<AnalysisResult> {
  const language: LanguageCode = ALLOWED_LANGUAGES.has(input.language)
    ? input.language
    : 'English';
  const reportText = input.text?.trim() ?? '';
  const fileMime = input.file?.mimeType?.toLowerCase() ?? '';
  const fileData = input.file?.data?.trim() ?? '';

  if (!reportText && (!fileMime || !fileData)) {
    throw new Error('Please upload a medical lab report image (JPG/PNG) or PDF before analyzing.');
  }

  if (fileData && !ALLOWED_MIME_TYPES.has(fileMime)) {
    throw new Error('Unsupported file format. Please upload a JPG, PNG, or PDF medical report.');
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API key is missing. Set VITE_GEMINI_API_KEY in your Vercel environment variables (or GEMINI_API_KEY in Google AI Studio Secrets).'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (fileData && fileMime) {
    parts.push({
      inlineData: {
        mimeType: fileMime === 'image/jpg' ? 'image/jpeg' : fileMime,
        data: fileData,
      },
    });
    parts.push({
      text: `Analyze this uploaded medical laboratory report and return the structured JSON interpretation in ${language}. Extract every test parameter visible on the report.`,
    });
  } else {
    parts.push({
      text: `Analyze the following medical laboratory report and return the structured JSON interpretation in ${language}:\n\n${reportText}`,
    });
  }

  try {
    const response = await callGeminiWithFallback(ai, parts, language);
    const rawText = (response.text ?? '').trim();

    if (!rawText) {
      throw new Error(
        'The AI engine returned an empty response. Please try analyzing the report again.'
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      const fenced = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedJson = JSON.parse(fenced);
    }

    return validateAnalysisPayload(parsedJson, language, Boolean(input.redactionApplied));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected analysis error.';

    if (
      message.includes('API_KEY_INVALID') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('API key')
    ) {
      throw new Error(
        'Gemini API key is invalid or unauthorized. Please verify VITE_GEMINI_API_KEY in your environment settings.'
      );
    }

    if (
      message.includes('503') ||
      message.includes('UNAVAILABLE') ||
      message.includes('high demand')
    ) {
      throw new Error(
        'The AI service is temporarily experiencing high demand. Please wait a few seconds and click Try Again.'
      );
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      throw new Error(
        'The AI service is temporarily busy due to rate limits. Please wait a moment and try again.'
      );
    }

    if (
      message.startsWith('Please upload') ||
      message.startsWith('Unsupported file') ||
      message.startsWith('No lab test parameters') ||
      message.startsWith('The AI engine returned')
    ) {
      throw error instanceof Error ? error : new Error(message);
    }

    throw new Error('Could not analyze this report right now. Please try again in a moment.');
  }
}
