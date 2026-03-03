import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  UserProgression,
  calculateLevelFromXP,
  getRankFromRR,
  getWeeklyXPReward,
  getXPProgress,
} from "@/lib/progression";

const baseProgression: UserProgression = {
  id: "progression-1",
  user_id: "user-1",
  level: 1,
  xp: 0,
  rank: "bronze",
  rr_points: 0,
  current_streak: 0,
  longest_streak: 0,
  weeks_completed: 0,
  perfect_weeks: 0,
  total_ships: 0,
  total_content: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const achievementById = (id: string) => {
  const achievement = ACHIEVEMENTS.find((item) => item.id === id);
  if (!achievement) throw new Error(`Missing achievement: ${id}`);
  return achievement;
};

describe("progression utilities", () => {
  it("calculates level boundaries from XP", () => {
    expect(calculateLevelFromXP(0)).toBe(1);
    expect(calculateLevelFromXP(99)).toBe(1);
    expect(calculateLevelFromXP(100)).toBe(2);
    expect(calculateLevelFromXP(1000)).toBe(11);
  });

  it("maps RR points to rank thresholds", () => {
    expect(getRankFromRR(0)).toBe("bronze");
    expect(getRankFromRR(499)).toBe("bronze");
    expect(getRankFromRR(500)).toBe("silver");
    expect(getRankFromRR(999)).toBe("silver");
    expect(getRankFromRR(1000)).toBe("gold");
    expect(getRankFromRR(1500)).toBe("platinum");
    expect(getRankFromRR(2000)).toBe("diamond");
  });

  it("computes XP progress percentages within level", () => {
    expect(getXPProgress(0)).toEqual({ current: 0, required: 100, percentage: 0 });
    expect(getXPProgress(150)).toEqual({
      current: 50,
      required: 100,
      percentage: 50,
    });
  });

  it("returns weekly XP rewards at tier boundaries", () => {
    expect(getWeeklyXPReward(100)).toBe(100);
    expect(getWeeklyXPReward(80)).toBe(75);
    expect(getWeeklyXPReward(79)).toBe(50);
    expect(getWeeklyXPReward(60)).toBe(50);
    expect(getWeeklyXPReward(40)).toBe(25);
    expect(getWeeklyXPReward(20)).toBe(10);
    expect(getWeeklyXPReward(19)).toBe(0);
  });

  it("evaluates achievement conditions at threshold values", () => {
    expect(
      achievementById("first_week").condition({
        ...baseProgression,
        weeks_completed: 1,
      }),
    ).toBe(true);

    expect(
      achievementById("streak_4").condition({
        ...baseProgression,
        current_streak: 4,
      }),
    ).toBe(true);

    expect(
      achievementById("level_10").condition({
        ...baseProgression,
        level: 10,
      }),
    ).toBe(true);

    expect(
      achievementById("rank_silver").condition({
        ...baseProgression,
        rank: "silver",
      }),
    ).toBe(true);

    expect(
      achievementById("perfect_week").condition({
        ...baseProgression,
        perfect_weeks: 1,
      }),
    ).toBe(true);
  });
});
