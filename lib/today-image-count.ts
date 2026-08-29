export type DriveImageFile = {
  id?: string;
  name?: string;
  mimeType?: string;
};

type DriveListResponse = {
  files?: DriveImageFile[];
  nextPageToken?: string;
};

type FetchTodayImageCountOptions = {
  apiKey: string;
  folderId: string;
  now?: Date;
  fetchImpl?: typeof fetch;
};

export function currentDateKeyInJapan(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

export function countMatchingImages(files: DriveImageFile[], dateKey: string) {
  const dateToken = `_${dateKey}_`;
  return files.filter((file) => file.mimeType?.startsWith("image/") && file.name?.includes(dateToken)).length;
}

function escapeDriveQueryValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

export async function fetchTodayImageCount({
  apiKey,
  folderId,
  now = new Date(),
  fetchImpl = fetch,
}: FetchTodayImageCountOptions) {
  if (!apiKey) throw new Error("GOOGLE_DRIVE_API_KEY is not configured");
  if (!folderId) throw new Error("GOOGLE_DRIVE_IMAGE_FOLDER_ID is not configured");

  const dateKey = currentDateKeyInJapan(now);
  const files: DriveImageFile[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false and name contains '_${dateKey}_'`,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "1000",
      spaces: "drive",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetchImpl(`https://www.googleapis.com/drive/v3/files?${params}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Google Drive API returned ${response.status}`);

    const data = await response.json() as DriveListResponse;
    if (!Array.isArray(data.files)) throw new Error("Google Drive API returned an invalid response");
    files.push(...data.files);
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken);

  return { count: countMatchingImages(files, dateKey), dateKey };
}
