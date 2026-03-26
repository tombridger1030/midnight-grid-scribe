import { describe, it, expect } from "vitest";
import regression from "regression";

// computePrediction: takes array of {x, y} data points and a unit string.
// Returns { text, targetValue } or null.
// Rules:
// - Returns null if < 14 data points
// - Runs linear regression via regression-js
// - Returns null if R-squared < 0.3 (noisy/unreliable)
// - Returns null if slope is 0 (zero variance)
// - Projects 30 days forward for the prediction text

function computePrediction(
  dataPoints: { x: number; y: number }[],
  unit: string,
): { text: string; targetValue: number } | null {
  if (dataPoints.length < 14) return null;

  const recent = dataPoints.slice(-90);
  const regressionData: [number, number][] = recent.map((p) => [p.x, p.y]);
  const result = regression.linear(regressionData);

  if (result.r2 === null || result.r2 < 0.3) return null;

  const slope = result.equation[0];
  if (slope === 0) return null;

  const lastX = recent[recent.length - 1].x;
  const projectedValue = slope * (lastX + 30) + result.equation[1];

  return {
    text: `At this rate, ${Math.round(projectedValue)} ${unit} by end of next month.`,
    targetValue: Math.round(projectedValue),
  };
}

describe("Prediction Engine", () => {
  it("returns null with fewer than 14 data points", () => {
    const data = Array.from({ length: 13 }, (_, i) => ({ x: i, y: i * 2 }));
    expect(computePrediction(data, "commits")).toBeNull();
  });

  it("returns prediction with 14+ data points and clear trend", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: 10 + i * 2,
    }));
    const result = computePrediction(data, "commits");
    expect(result).not.toBeNull();
    expect(result!.targetValue).toBeGreaterThan(70);
  });

  it("returns null when R-squared is below 0.3 (noisy data)", () => {
    const noisyData = [
      { x: 0, y: 100 },
      { x: 1, y: 20 },
      { x: 2, y: 80 },
      { x: 3, y: 10 },
      { x: 4, y: 90 },
      { x: 5, y: 5 },
      { x: 6, y: 95 },
      { x: 7, y: 15 },
      { x: 8, y: 85 },
      { x: 9, y: 25 },
      { x: 10, y: 75 },
      { x: 11, y: 35 },
      { x: 12, y: 65 },
      { x: 13, y: 45 },
    ];
    expect(computePrediction(noisyData, "commits")).toBeNull();
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
});
