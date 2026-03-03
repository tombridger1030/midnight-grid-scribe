import { describe, expect, it } from "vitest";
import {
  SkillData,
  deserializeSkillRow,
  formatSkillValue,
  getDaysUntilDate,
  isDateOverdue,
} from "./skillProgression";

const baseSkill: SkillData = {
  id: "skill-1",
  name: "Revenue",
  category: "Business",
  icon: "TrendingUp",
  color: "#5FE3B3",
  unit: "%",
  currentValue: 50,
  targetValue: 100,
  progressPercentage: 50,
  checkpoints: [],
};

const dateWithOffset = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
};

describe("skillProgression utilities", () => {
  it("formats USD values", () => {
    expect(formatSkillValue({ ...baseSkill, unit: "USD" }, 14500)).toBe("$14.5k");
  });

  it("formats USD/year values", () => {
    expect(formatSkillValue({ ...baseSkill, unit: "USD/year" }, 32000)).toBe(
      "$32.0k ARR",
    );
  });

  it("formats belt values", () => {
    expect(formatSkillValue({ ...baseSkill, unit: "belt" }, 2)).toBe(
      "Purple Belt",
    );
  });

  it("formats body fat percentage values", () => {
    expect(formatSkillValue({ ...baseSkill, unit: "% BF" }, 13.27)).toBe(
      "13.3%",
    );
  });

  it("formats default unit values", () => {
    expect(formatSkillValue({ ...baseSkill, unit: " hrs" }, 12)).toBe("12 hrs");
  });

  it("calculates days until future and past dates", () => {
    expect(getDaysUntilDate(dateWithOffset(3))).toBe(3);
    expect(getDaysUntilDate(dateWithOffset(-2))).toBe(-2);
  });

  it("detects overdue dates", () => {
    expect(isDateOverdue(dateWithOffset(-1))).toBe(true);
    expect(isDateOverdue(dateWithOffset(2))).toBe(false);
  });

  it("deserializes DB rows into SkillData", () => {
    const row = {
      id: "db-row-id",
      user_id: "user-1",
      skill_id: "net-worth",
      skill_name: "Net Worth",
      category: "Financial",
      current_level: 145000,
      target_level: 3500000,
      progress_data: {
        unit: "USD",
        icon: "DollarSign",
        color: "#10B981",
        checkpoints: [
          {
            id: "cp-1",
            name: "$500k",
            targetDate: "2026-10-01",
            isCompleted: false,
            progressPercentage: 15,
          },
        ],
      },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };

    const result = deserializeSkillRow(row);

    expect(result.id).toBe("net-worth");
    expect(result.name).toBe("Net Worth");
    expect(result.unit).toBe("USD");
    expect(result.icon).toBe("DollarSign");
    expect(result.color).toBe("#10B981");
    expect(result.currentValue).toBe(145000);
    expect(result.targetValue).toBe(3500000);
    expect(result.progressPercentage).toBeCloseTo((145000 / 3500000) * 100, 5);
    expect(result.checkpoints).toHaveLength(1);
    expect(result.checkpoints[0].name).toBe("$500k");
  });
});
