import { describe, expect, it } from "vitest";
import { buildLearningHistory, combineLearningTotals, parseGvizDailyTotals } from "@/lib/learning-summary";

function response(rows: unknown[]) {
  return `google.visualization.Query.setResponse(${JSON.stringify({ table: { rows } })});`;
}

describe("learning summary", () => {
  it("sums each learning day", () => {
    const text = response([
      { c: [{ v: "Date(2026,7,23)" }, { v: 5 }, { v: "Date(1899,11,30,0,3,22)", f: "0:03:22" }] },
      { c: [{ v: "Date(2026,7,23)" }, { v: 5 }, { v: "Date(1899,11,30,0,5,58)", f: "0:05:58" }] },
      { c: [{ v: "Date(2026,7,22)" }, { v: 10 }, { v: 900 / 86400 }] },
    ]);
    expect(parseGvizDailyTotals(text)).toEqual({
      "2026-08-22": { problems: 10, seconds: 900 },
      "2026-08-23": { problems: 10, seconds: 560 },
    });
  });

  it("combines the two learning records", () => {
    expect(combineLearningTotals({ problems: 45, seconds: 1304 }, { problems: 15, seconds: 898 }))
      .toEqual({ problems: 60, seconds: 2202 });
  });

  it("creates a zero-filled 14-day history", () => {
    const history = buildLearningHistory(
      { "2026-08-22": { problems: 45, seconds: 1304 } },
      { "2026-08-23": { problems: 15, seconds: 898 } },
      "2026-08-23",
    );
    expect(history).toHaveLength(14);
    expect(history[0]).toEqual({ date: "2026-08-10", problems: 0, seconds: 0 });
    expect(history.at(-2)).toEqual({ date: "2026-08-22", problems: 45, seconds: 1304 });
    expect(history.at(-1)).toEqual({ date: "2026-08-23", problems: 15, seconds: 898 });
  });
});
