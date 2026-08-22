import { describe, expect, it } from "vitest";
import { manualTimeInputSchema, minutesToSeconds, parseMinuteText } from "@/lib/validation";

describe("manual time validation", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  it.each([1, 1440])("accepts %i minutes", (minutes) => expect(manualTimeInputSchema.safeParse({ requestId: id, minutes }).success).toBe(true));
  it.each([0, 1441, 1.5, "10", null])("rejects invalid value %s", (minutes) => expect(manualTimeInputSchema.safeParse({ requestId: id, minutes }).success).toBe(false));
  it("converts minutes to seconds", () => expect(minutesToSeconds(60)).toBe(3600));
  it.each([["", null], ["abc", null], ["1.5", null], ["0", null], ["1441", null], ["60", 60]])("parses text %s", (value, expected) => expect(parseMinuteText(value as string)).toBe(expected));
});
