import { describe, it, expect } from "vitest";
import regression from "regression";

// Mirror of computePrediction from MissionControl.tsx
function computePrediction(
  dataPoints: { x: number; y: number }[],
  unit: string,
  mode: "cumulative" | "raw" = "raw",
): { text: string; targetValue: number } | null {
  if (dataPoints.length < 14) return null;
  const recent = dataPoints.slice(-90);

  let regressionInput: [number, number][];
  if (mode === "cumulative") {
    let cumulative = 0;
    regressionInput = recent.map((p) => {
      cumulative += p.y;
      return [p.x, cumulative] as [number, number];
    });
  } else {
    regressionInput = recent.map((p) => [p.x, p.y]);
  }

  const result = regression.linear(regressionInput);
  if (result.r2 === null || result.r2 < 0.1) return null;
  const slope = result.equation[0];
  if (slope === 0) return null;

  if (mode === "cumulative") {
    const dailyRate = slope;
    const projectedMonthEnd = Math.round(
      regressionInput[regressionInput.length - 1][1] + dailyRate * 5,
    );
    const avgPerDay = Math.round(dailyRate * 10) / 10;
    return {
      text: `Averaging ${avgPerDay} ${unit}/day. On pace for ~${projectedMonthEnd.toLocaleString()} total ${unit} by end of month.`,
      targetValue: projectedMonthEnd,
    };
  }

  const lastX = recent[recent.length - 1].x;
  const projected = slope * (lastX + 30) + result.equation[1];
  return {
    text: `At this rate, ${Math.round(projected)} ${unit} by end of next month.`,
    targetValue: Math.round(projected),
  };
}

describe("Prediction Engine", () => {
  it("returns null with fewer than 14 data points", () => {
    const data = Array.from({ length: 13 }, (_, i) => ({ x: i, y: i * 2 }));
    expect(computePrediction(data, "commits")).toBeNull();
  });

  it("returns prediction with 14+ data points and clear trend (raw mode)", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: 10 + i * 2,
    }));
    const result = computePrediction(data, "commits");
    expect(result).not.toBeNull();
    expect(result!.targetValue).toBeGreaterThan(70);
  });

  it("returns null with zero variance (all identical values)", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 50 }));
    expect(computePrediction(data, "commits")).toBeNull();
  });

  it("handles negative slope (declining metrics)", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: 100 - i * 2,
    }));
    const result = computePrediction(data, "%");
    expect(result).not.toBeNull();
    expect(result!.targetValue).toBeLessThan(50);
  });

  it("cumulative mode produces predictions from noisy daily data", () => {
    // Simulate real commit data: noisy daily counts (0-30 range)
    const noisyDailyCommits = [
      { x: 0, y: 5 },
      { x: 1, y: 0 },
      { x: 2, y: 12 },
      { x: 3, y: 3 },
      { x: 4, y: 0 },
      { x: 5, y: 8 },
      { x: 6, y: 0 },
      { x: 7, y: 15 },
      { x: 8, y: 2 },
      { x: 9, y: 0 },
      { x: 10, y: 7 },
      { x: 11, y: 20 },
      { x: 12, y: 0 },
      { x: 13, y: 4 },
      { x: 14, y: 10 },
    ];

    // Raw mode would reject this (too noisy)
    const rawResult = computePrediction(noisyDailyCommits, "commits", "raw");
    expect(rawResult).toBeNull();

    // Cumulative mode should produce a prediction (monotonically increasing)
    const cumulativeResult = computePrediction(
      noisyDailyCommits,
      "commits",
      "cumulative",
    );
    expect(cumulativeResult).not.toBeNull();
    expect(cumulativeResult!.text).toContain("Averaging");
    expect(cumulativeResult!.text).toContain("commits/day");
    expect(cumulativeResult!.targetValue).toBeGreaterThan(80);
  });

  it("cumulative mode calculates reasonable daily rate", () => {
    // 20 days, roughly 5 commits/day average
    const data = Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: 3 + Math.round(Math.sin(i) * 2 + 2), // varies 3-7, avg ~5
    }));
    const result = computePrediction(data, "commits", "cumulative");
    expect(result).not.toBeNull();
    expect(result!.text).toContain("/day");
  });
});
