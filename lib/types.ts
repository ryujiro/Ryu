export type GrantStatus = "pending" | "sending" | "acknowledged" | "failed";

export type TimeGrant = {
  id: string;
  requestId: string;
  sendId: string;
  transferId: string;
  sessionId: string;
  minutes: number;
  seconds: number;
  status: GrantStatus;
  responseText: string | null;
  remainingSeconds: number | null;
  actualAddedSeconds: number | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  source: "manual";
};

export type DeviceStatus = {
  deviceLabel: string;
  lastSeenAt: string | null;
  apiStatus: "ok" | "unavailable";
  preview: boolean;
};
