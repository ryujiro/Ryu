import { afterEach, describe, expect, it } from "vitest";
import { stableQueueUuid } from "@/lib/current-queue";

describe("stable queue identifiers", () => {
  afterEach(() => { delete process.env.SESSION_SECRET; });

  it("keeps ids stable across retries and separates transfer/send ids", () => {
    process.env.SESSION_SECRET = "test-secret";
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    expect(stableQueueUuid("send", requestId)).toBe(stableQueueUuid("send", requestId));
    expect(stableQueueUuid("send", requestId)).not.toBe(stableQueueUuid("transfer", requestId));
    expect(stableQueueUuid("send", requestId)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
