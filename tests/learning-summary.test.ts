import { describe, expect, it } from "vitest";
import { combineLearningTotals, parseGvizTable } from "@/lib/learning-summary";

function response(rows: unknown[]) {
  return `google.visualization.Query.setResponse(${JSON.stringify({ table: { rows } })});`;
}

describe("learning summary", () => {
  it("sums only the requested day", () => {
    const text = response([
      { c: [{ v: "Date(2026,7,23)" }, { v: 5 }, { v: "Date(1899,11,30,0,3,22)", f: "0:03:22" }] },
      { c: [{ v: "Date(2026,7,23)" }, { v: 5 }, { v: "Date(1899,11,30,0,5,58)", f: "0:05:58" }] },
      { c: [{ v: "Date(2026,7,22)" }, { v: 10 }, { v: 900 / 86400 }] },
    ]);
    expect(parseGvizTable(text, "2026-08-23")).toEqual({ problems: 10, seconds: 560 });
  });

  it("combines the two learning records", () => {
    expect(combineLearningTotals({ problems: 45, seconds: 1304 }, { problems: 15, seconds: 898 }))
      .toEqual({ problems: 60, seconds: 2202 });
  });
});
