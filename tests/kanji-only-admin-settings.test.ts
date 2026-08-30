import { describe, expect, it, vi } from "vitest";
import { fetchKanjiOnlySettings, kanjiOnlySettingsSchema, parseKanjiOnlyQuestionCount, saveKanjiOnlySettings } from "@/lib/kanji-only-admin-settings";

const gviz = (value: unknown) => `google.visualization.Query.setResponse(${JSON.stringify({ table: { rows: [{ c: [{ v: value }] }] } })});`;

describe("kanji-only admin settings", () => {
  it("accepts only integer counts from 1 to 1000", () => {
    expect(kanjiOnlySettingsSchema.safeParse({ questionCount: 1 }).success).toBe(true);
    expect(kanjiOnlySettingsSchema.safeParse({ questionCount: 1000 }).success).toBe(true);
    expect(kanjiOnlySettingsSchema.safeParse({ questionCount: 0 }).success).toBe(false);
    expect(kanjiOnlySettingsSchema.safeParse({ questionCount: 1001 }).success).toBe(false);
    expect(kanjiOnlySettingsSchema.safeParse({ questionCount: 1.5 }).success).toBe(false);
  });

  it("reads the numeric value from 管理!B2", () => {
    expect(parseKanjiOnlyQuestionCount(gviz(100))).toBe(100);
    expect(() => parseKanjiOnlyQuestionCount(gviz("100"))).toThrow("問題数を確認できませんでした");
  });

  it("requests only 管理!B2 when loading", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(gviz(100), { status: 200 }));
    await expect(fetchKanjiOnlySettings(fetchImpl)).resolves.toEqual({ questionCount: 100 });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("sheet")).toBe("管理");
    expect(url.searchParams.get("range")).toBe("B2");
  });

  it("writes only the validated value to 管理!B2", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ updatedCells: 1 }), { status: 200 }));
    await expect(saveKanjiOnlySettings(
      { questionCount: 50 },
      "unused-in-test",
      { fetchImpl, tokenProvider: vi.fn().mockResolvedValue("server-token") },
    )).resolves.toEqual({ questionCount: 50 });

    const [url, request] = fetchImpl.mock.calls[0];
    expect(decodeURIComponent(String(url))).toContain("/values/管理!B2?valueInputOption=RAW");
    expect(request?.method).toBe("PUT");
    expect(request?.headers).toMatchObject({ authorization: "Bearer server-token" });
    expect(JSON.parse(String(request?.body))).toEqual({ range: "管理!B2", majorDimension: "ROWS", values: [[50]] });
  });

  it("rejects invalid values before calling Google Sheets", async () => {
    const fetchImpl = vi.fn();
    await expect(saveKanjiOnlySettings(
      { questionCount: 0 },
      "unused-in-test",
      { fetchImpl, tokenProvider: vi.fn().mockResolvedValue("server-token") },
    )).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
