import { describe, expect, it } from "vitest";
import { createPreviewGrant } from "@/lib/preview-store";

describe("preview idempotency", () => {
  it("returns one record for the same requestId", () => {
    const requestId = crypto.randomUUID();
    const first = createPreviewGrant(requestId, 10); const second = createPreviewGrant(requestId, 10);
    expect(second.id).toBe(first.id); expect(second.sendId).toBe(first.sendId); expect(second.seconds).toBe(600); expect(second.sessionId).toBe(`manual:${requestId}`);
  });
});
