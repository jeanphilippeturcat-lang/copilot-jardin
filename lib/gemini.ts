import {
  GoogleGenAI,
  type ContentListUnion,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Nano Banana 2 Lite : moitié prix sur la génération 1K 16:9 (~$0.0336 direct, ~$0.0168 en Batch)
export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image";

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

const IMAGE_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image",
  "gemini-nano-banana-2.1",
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

function isRetryableImageStatus(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429 || status === 500 || status === 404 || status === 400;
}

function estErreurQuotaGratuitImage(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return status === 429 && (msg.includes("limit: 0") || msg.includes("FreeTier"));
}

const MESSAGE_QUOTA_GRATUIT =
  "La génération d'images Gemini n'est pas disponible sur le forfait gratuit (quota = 0). Active la facturation sur Google AI Studio (aistudio.google.com) pour activer la génération de BD.";

export interface GeminiGenerationResult {
  response: GenerateContentResponse;
  model: string;
}

export interface GeminiImageGenerationResult {
  buffer: Buffer;
  mimeType: string;
  model: string;
}

export interface GeminiImageBatchCreated {
  jobName: string;
  state: string;
  model: string;
}

export type GeminiImageBatchPollResult =
  | { status: "pending"; state: string }
  | { status: "succeeded"; state: string; buffer: Buffer; mimeType: string }
  | { status: "failed"; state: string; error: string };

function extraireImageDepuisReponse(
  response: GenerateContentResponse | undefined
): { buffer: Buffer; mimeType: string } | null {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
        return {
          buffer: Buffer.from(part.inlineData.data, "base64"),
          mimeType: part.inlineData.mimeType,
        };
      }
    }
  }
  return null;
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

/**
 * Génération d'image directe (appel unique stateless, 1K par défaut).
 */
export async function generateGeminiImage(params: {
  contents: ContentListUnion;
  aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize?: "1K" | "2K";
}): Promise<GeminiImageGenerationResult> {
  const gemini = getGeminiClient();
  const modelsToTry = [
    GEMINI_IMAGE_MODEL,
    ...IMAGE_FALLBACK_MODELS.filter((m) => m !== GEMINI_IMAGE_MODEL),
  ];

  let lastError: unknown;
  let tousQuotaGratuit = true;

  for (const model of modelsToTry) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: params.contents,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: params.aspectRatio ?? "16:9",
            imageSize: params.imageSize ?? "1K",
          },
        },
      });

      const image = extraireImageDepuisReponse(response);
      if (image) {
        return { ...image, model };
      }

      tousQuotaGratuit = false;
      lastError = new Error(`Aucune image retournée par le modèle ${model}`);
    } catch (err) {
      lastError = err;
      if (!estErreurQuotaGratuitImage(err)) {
        tousQuotaGratuit = false;
      }
      if (!isRetryableImageStatus(err)) {
        throw err;
      }
    }
  }

  if (tousQuotaGratuit && lastError) {
    throw new Error(MESSAGE_QUOTA_GRATUIT);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Impossible de générer l'image avec Gemini");
}

/**
 * Met en file d'attente la génération d'une image via la Gemini Batch API (-50% sur le coût).
 * Requête unique stateless avec une seule image de référence compressée (optionnelle).
 */
export async function createGeminiImageBatchJob(params: {
  contents: ContentListUnion;
  displayName: string;
  aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize?: "1K" | "2K";
}): Promise<GeminiImageBatchCreated> {
  const gemini = getGeminiClient();
  const modelsToTry = [
    GEMINI_IMAGE_MODEL,
    ...IMAGE_FALLBACK_MODELS.filter((m) => m !== GEMINI_IMAGE_MODEL),
  ];

  let lastError: unknown;
  let tousQuotaGratuit = true;

  for (const model of modelsToTry) {
    try {
      const job = await gemini.batches.create({
        model,
        src: [
          {
            contents: params.contents,
            config: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: params.aspectRatio ?? "16:9",
                imageSize: params.imageSize ?? "1K",
              },
            },
          },
        ],
        config: {
          displayName: params.displayName,
        },
      });

      if (!job.name) {
        throw new Error("Identifiant de tâche Batch absent de la réponse Gemini");
      }

      return {
        jobName: job.name,
        state: job.state ?? "JOB_STATE_QUEUED",
        model,
      };
    } catch (err) {
      lastError = err;
      if (!estErreurQuotaGratuitImage(err)) {
        tousQuotaGratuit = false;
      }
      if (!isRetryableImageStatus(err)) {
        throw err;
      }
    }
  }

  if (tousQuotaGratuit && lastError) {
    throw new Error(MESSAGE_QUOTA_GRATUIT);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Impossible de créer le job Batch Gemini");
}

/**
 * Vérifie l'état d'un job Batch Gemini et extrait l'image générée s'il est terminé.
 */
export async function getGeminiImageBatchResult(
  jobName: string
): Promise<GeminiImageBatchPollResult> {
  const gemini = getGeminiClient();
  const job = await gemini.batches.get({ name: jobName });
  const state = job.state ?? "JOB_STATE_UNSPECIFIED";

  if (state === "JOB_STATE_SUCCEEDED") {
    const first = job.dest?.inlinedResponses?.[0];
    if (first?.error) {
      return {
        status: "failed",
        state,
        error: first.error.message || "Erreur retournée par la requête Batch",
      };
    }
    const image = extraireImageDepuisReponse(first?.response);
    if (!image) {
      return {
        status: "failed",
        state,
        error: "Le job Batch s'est terminé sans retourner d'image",
      };
    }
    return {
      status: "succeeded",
      state,
      buffer: image.buffer,
      mimeType: image.mimeType,
    };
  }

  if (
    state === "JOB_STATE_FAILED" ||
    state === "JOB_STATE_CANCELLED" ||
    state === "JOB_STATE_EXPIRED"
  ) {
    return {
      status: "failed",
      state,
      error: job.error?.message || `Job Batch interrompu (${state})`,
    };
  }

  return { status: "pending", state };
}
