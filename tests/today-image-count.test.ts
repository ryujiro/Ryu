import { describe, expect, it, vi } from "vitest";
import { countMatchingImages, currentDateKeyInJapan, fetchTodayImageCount } from "@/lib/today-image-count";

describe("today image count", () => {
  it("uses the calendar date in Asia/Tokyo", () => {
    expect(currentDateKeyInJapan(new Date("2026-08-28T14:59:59Z"))).toBe("20260828");
    expect(currentDateKeyInJapan(new Date("2026-08-28T15:00:00Z"))).toBe("20260829");
  });

  it("counts only images whose names contain today's date token", () => {
    expect(countMatchingImages([
      { name: "sugaku_20260829_172825.jpg", mimeType: "image/jpeg" },
      { name: "eigo_20260829_173041.png", mimeType: "image/png" },
      { name: "eigo_20260828_173041.jpg", mimeType: "image/jpeg" },
      { name: "memo_20260829_173041.txt", mimeType: "text/plain" },
      { name: "sugaku-20260829-172825.jpg", mimeType: "image/jpeg" },
    ], "20260829")).toBe(2);
  });

  it("counts matching images across Drive API pages", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        files: [{ name: "sugaku_20260829_172825.jpg", mimeType: "image/jpeg" }],
        nextPageToken: "next-page",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        files: [
          { name: "eigo_20260829_173041.jpg", mimeType: "image/jpeg" },
          { name: "memo_20260829_173041.txt", mimeType: "text/plain" },
        ],
      }), { status: 200 }));

    await expect(fetchTodayImageCount({
      apiKey: "test-key",
      folderId: "test-folder",
      now: new Date("2026-08-29T03:00:00Z"),
      fetchImpl,
    })).resolves.toEqual({ count: 2, dateKey: "20260829" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain("pageToken=next-page");
  });

  it("fails clearly when the API key is missing", async () => {
    await expect(fetchTodayImageCount({ apiKey: "", folderId: "test-folder" }))
      .rejects.toThrow("GOOGLE_DRIVE_API_KEY is not configured");
  });
});
