import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const settingsPath = path.join(process.cwd(), "data", "ai-settings.json");

const httpsUrl = z.string().trim().url().max(500).refine(
  (value) => new URL(value).protocol === "https:",
  "API 地址必须使用 HTTPS。",
);

export const aiSettingsUpdateSchema = z.object({
  baseUrl: z.union([httpsUrl, z.literal("")]).optional(),
  apiKey: z.string().trim().min(8).max(1000).optional(),
  clearApiKey: z.boolean().optional(),
  model: z.string().trim().min(1).max(120).optional(),
  transcriptionModel: z.string().trim().min(1).max(120).optional(),
});

const storedSettingsSchema = z.object({
  baseUrl: z.string().trim().max(500).nullable().default(null),
  apiKey: z.string().max(1000).nullable().default(null),
  model: z.string().trim().min(1).max(120).default("gpt-6-luna"),
  transcriptionModel: z.string().trim().min(1).max(120).default("gpt-4o-mini-transcribe"),
});

type StoredAiSettings = z.infer<typeof storedSettingsSchema>;

export interface ResolvedAiSettings {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  transcriptionModel: string;
  source: "saved" | "environment" | "demo";
}

export interface PublicAiSettings {
  baseUrl: string;
  model: string;
  transcriptionModel: string;
  apiKeyConfigured: boolean;
  apiKeyHint: string | null;
  source: ResolvedAiSettings["source"];
}

async function readStoredSettings(): Promise<StoredAiSettings | null> {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return storedSettingsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function resolveAiSettings(): Promise<ResolvedAiSettings> {
  const saved = await readStoredSettings();
  const apiKey = saved?.apiKey || process.env.OPENAI_API_KEY || undefined;
  const baseUrl = saved?.baseUrl || process.env.OPENAI_BASE_URL || undefined;
  return {
    apiKey,
    baseUrl,
    model: saved?.model || process.env.OPENAI_MODEL || "gpt-6-luna",
    transcriptionModel:
      saved?.transcriptionModel || process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
    source: saved ? "saved" : apiKey ? "environment" : "demo",
  };
}

function toPublicSettings(settings: ResolvedAiSettings): PublicAiSettings {
  return {
    baseUrl: settings.baseUrl ?? "",
    model: settings.model,
    transcriptionModel: settings.transcriptionModel,
    apiKeyConfigured: Boolean(settings.apiKey),
    apiKeyHint: settings.apiKey ? `••••${settings.apiKey.slice(-4)}` : null,
    source: settings.source,
  };
}

export async function getPublicAiSettings(): Promise<PublicAiSettings> {
  return toPublicSettings(await resolveAiSettings());
}

export async function updateAiSettings(input: unknown): Promise<PublicAiSettings> {
  const update = aiSettingsUpdateSchema.parse(input);
  const current = await readStoredSettings();
  const next = storedSettingsSchema.parse({
    baseUrl: update.baseUrl === "" ? null : update.baseUrl ?? current?.baseUrl ?? null,
    apiKey: update.clearApiKey ? null : update.apiKey ?? current?.apiKey ?? null,
    model: update.model ?? current?.model ?? process.env.OPENAI_MODEL ?? "gpt-6-luna",
    transcriptionModel:
      update.transcriptionModel
      ?? current?.transcriptionModel
      ?? process.env.OPENAI_TRANSCRIBE_MODEL
      ?? "gpt-4o-mini-transcribe",
  });

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporaryPath, settingsPath);
  await fs.chmod(settingsPath, 0o600);
  return getPublicAiSettings();
}
