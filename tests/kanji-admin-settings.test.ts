import { describe, expect, it, vi } from "vitest";
import { fetchKanjiAppSettings, kanjiAppSettingsSchema, saveKanjiAppSettings } from "@/lib/kanji-admin-settings";

const settings = {
  questionCount: 100,
  englishAudioEnabled: true,
  subjectWeights: { "国語": 0, "社会": 1, "英語": 1, "数学": 1, "理科": 0 },
};

describe("kanji admin settings", () => {
  it("accepts the current shared settings", () => {
    expect(kanjiAppSettingsSchema.safeParse(settings).success).toBe(true);
  });

  it("rejects invalid counts and all-zero subject weights", () => {
    expect(kanjiAppSettingsSchema.safeParse({ ...settings, questionCount: 0 }).success).toBe(false);
    expect(kanjiAppSettingsSchema.safeParse({ ...settings, subjectWeights: { "国語": 0, "英語": 0 } }).success).toBe(false);
  });

  it("reads shared settings without sending a passcode", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ configured: true, settings }), { status: 200 }));
    await expect(fetchKanjiAppSettings(fetchImpl)).resolves.toEqual(settings);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/api/app-settings"), expect.not.objectContaining({ body: expect.anything() }));
  });

  it("keeps the admin passcode in the server-side save request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ settings }), { status: 200 }));
    await expect(saveKanjiAppSettings(settings, "server-secret", fetchImpl)).resolves.toEqual(settings);
    const request = fetchImpl.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({ passcode: "server-secret", settings });
  });

  it("fails safely when the server passcode is missing", async () => {
    await expect(saveKanjiAppSettings(settings, "")).rejects.toThrow("管理用接続設定がありません");
  });
});
