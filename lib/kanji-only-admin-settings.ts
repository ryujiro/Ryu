import { createSign } from "node:crypto";
import { z } from "zod";

export const kanjiOnlySettingsSchema = z.object({
  questionCount: z.number().int().min(1).max(1000),
});

export type KanjiOnlySettings = z.infer<typeof kanjiOnlySettingsSchema>;

type GvizCell = { v?: unknown } | null;
type GvizResponse = { table?: { rows?: Array<{ c?: GvizCell[] }> } };
type ServiceAccountCredentials = { client_email: string; private_key: string };
type TokenProvider = (credentialsJson: string) => Promise<string>;

const DEFAULT_SPREADSHEET_ID = "1X44JkuPeX1shOjjL6LVZDhZ-8OcC7hpgORzQRiWj5SM";
const SETTINGS_RANGE = "管理!B2";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function spreadsheetId() {
  return process.env.LEARNING_SHEET_ID_KANJI ?? DEFAULT_SPREADSHEET_ID;
}

function parseServiceAccountCredentials(raw: string): ServiceAccountCredentials {
  if (!raw) throw new Error("Google Sheetsの書き込み認証がありません");
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error("Google Sheetsの書き込み認証を読み取れませんでした"); }
  const parsed = z.object({ client_email: z.string().email(), private_key: z.string().min(1) }).safeParse(value);
  if (!parsed.success) throw new Error("Google Sheetsの書き込み認証を確認できませんでした");
  return parsed.data;
}

async function getServiceAccountAccessToken(credentialsJson: string) {
  const credentials = parseServiceAccountCredentials(credentialsJson);
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credentials.client_email,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now - 30,
    exp: now + 3_600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(credentials.private_key.replace(/\\n/g, "\n"))
    .toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  const result = await response.json() as { access_token?: string };
  const token = result.access_token;
  if (!token) throw new Error("Google Sheetsのアクセストークンを取得できませんでした");
  return token;
}

export function parseKanjiOnlyQuestionCount(text: string): number {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Google Sheetsの応答を読み取れませんでした");
  const response = JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  const value = response.table?.rows?.[0]?.c?.[0]?.v;
  const parsed = kanjiOnlySettingsSchema.safeParse({ questionCount: value });
  if (!parsed.success) throw new Error("管理シートの問題数を確認できませんでした");
  return parsed.data.questionCount;
}

export async function fetchKanjiOnlySettings(fetchImpl: typeof fetch = fetch): Promise<KanjiOnlySettings> {
  const params = new URLSearchParams({ tqx: "out:json", sheet: "管理", range: "B2", headers: "0" });
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId())}/gviz/tq?${params}`;
  const response = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Google Sheetsから取得できませんでした (${response.status})`);
  return { questionCount: parseKanjiOnlyQuestionCount(await response.text()) };
}

export async function saveKanjiOnlySettings(
  settings: KanjiOnlySettings,
  credentialsJson: string,
  options: { fetchImpl?: typeof fetch; tokenProvider?: TokenProvider } = {},
): Promise<KanjiOnlySettings> {
  const parsed = kanjiOnlySettingsSchema.parse(settings);
  const fetchImpl = options.fetchImpl ?? fetch;
  const accessToken = await (options.tokenProvider ?? getServiceAccountAccessToken)(credentialsJson);
  const range = encodeURIComponent(SETTINGS_RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${range}?valueInputOption=RAW`;
  const response = await fetchImpl(url, {
    method: "PUT",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ range: SETTINGS_RANGE, majorDimension: "ROWS", values: [[parsed.questionCount]] }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Google Sheetsへ保存できませんでした (${response.status})`);
  return parsed;
}
