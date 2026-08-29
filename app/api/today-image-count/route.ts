import { NextResponse } from "next/server";
import { fetchTodayImageCount } from "@/lib/today-image-count";

export const dynamic = "force-dynamic";

const DEFAULT_IMAGE_FOLDER_ID = "1r0I62YpVITmc1lcnunTQXfJH-0-LOiYU";

export async function GET() {
  try {
    const result = await fetchTodayImageCount({
      apiKey: process.env.GOOGLE_DRIVE_API_KEY ?? "",
      folderId: process.env.GOOGLE_DRIVE_IMAGE_FOLDER_ID ?? DEFAULT_IMAGE_FOLDER_ID,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("today-image-count fetch failed", error);
    return NextResponse.json(
      { error: "今日の画像枚数を取得できませんでした" },
      { status: 502, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
}
