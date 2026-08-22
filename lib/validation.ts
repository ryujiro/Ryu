import { z } from "zod";

export const manualTimeInputSchema = z.object({
  requestId: z.uuid(),
  minutes: z.number().int().min(1).max(1440)
});

export function minutesToSeconds(minutes: number): number {
  return z.number().int().min(1).max(1440).parse(minutes) * 60;
}

export function parseMinuteText(value: string): number | null {
  if (!/^[0-9]+$/.test(value)) return null;
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
}
