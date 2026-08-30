import { z } from "zod";

const subjectWeightsSchema = z.record(z.string().min(1).max(30), z.number().int().min(0).max(100))
  .refine((weights) => Object.keys(weights).length > 0, "教科設定がありません")
  .refine((weights) => Object.values(weights).some((weight) => weight > 0), "少なくとも1教科は1以上にしてください");

export const kanjiAppSettingsSchema = z.object({
  questionCount: z.number().int().min(1).max(1000),
  englishAudioEnabled: z.boolean(),
  subjectWeights: subjectWeightsSchema,
});

export type KanjiAppSettings = z.infer<typeof kanjiAppSettingsSchema>;

type UpstreamSettingsResponse = {
  configured?: boolean;
  settings?: unknown;
  error?: string;
};

const DEFAULT_API_BASE_URL = "https://kanji-review-trainer.ryuoishi524.chatgpt.site";

function settingsUrl(baseUrl = process.env.KANJI_SETTINGS_API_BASE_URL ?? DEFAULT_API_BASE_URL) {
  return new URL("/api/app-settings", baseUrl).toString();
}

async function parseResponse(response: Response) {
  let data: UpstreamSettingsResponse;
  try { data = await response.json() as UpstreamSettingsResponse; }
  catch { throw new Error("覚える君から正しい応答を受け取れませんでした"); }
  if (!response.ok || !data.settings) throw new Error(data.error ?? "覚える君の設定を取得できませんでした");
  const parsed = kanjiAppSettingsSchema.safeParse(data.settings);
  if (!parsed.success) throw new Error("覚える君の設定形式を確認できませんでした");
  return parsed.data;
}

export async function fetchKanjiAppSettings(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(settingsUrl(), {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  return parseResponse(response);
}

export async function saveKanjiAppSettings(settings: KanjiAppSettings, passcode: string, fetchImpl: typeof fetch = fetch) {
  if (!passcode) throw new Error("覚える君の管理用接続設定がありません");
  const parsed = kanjiAppSettingsSchema.parse(settings);
  const response = await fetchImpl(settingsUrl(), {
    method: "POST",
    cache: "no-store",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ passcode, settings: parsed }),
    signal: AbortSignal.timeout(8_000),
  });
  return parseResponse(response);
}
