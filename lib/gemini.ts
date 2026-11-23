import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n'est pas configurée");
  }
  return new GoogleGenAI({ apiKey });
}

function isRetryableStatus(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429 || status === 500;
}

export interface GeminiGenerationResult {
  response: GenerateContentResponse;
  model: string;
}

export async function generateGeminiContent(
  params: Omit<GenerateContentParameters, "model">
): Promise<GeminiGenerationResult> {
  const gemini = getGeminiClient();
  const modelsToTry = [
    GEMINI_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL),
  ];

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const response = await gemini.models.generateContent({ ...params, model });
      return { response, model };
    } catch (err) {
      lastError = err;
      if (!isRetryableStatus(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}
