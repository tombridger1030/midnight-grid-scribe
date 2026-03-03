import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSkills } from "./useSkills";
import { useAuth } from "@/contexts/AuthContext";
import * as skillProgressionLib from "@/lib/skillProgression";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/skillProgression", () => ({
  getUserSkills: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}));

const skillOne = {
  id: "skill-1",
  name: "Deep Work",
  category: "Productivity",
  icon: "Brain",
  color: "#7C3AED",
  unit: "hrs",
  currentValue: 20,
  targetValue: 40,
  progressPercentage: 50,
  checkpoints: [],
};

const skillTwo = {
  id: "skill-2",
  name: "BJJ",
  category: "Fitness",
  icon: "Dumbbell",
  color: "#3B82F6",
  unit: "sessions",
  currentValue: 3,
  targetValue: 6,
  progressPercentage: 50,
  checkpoints: [],
};

describe("useSkills", () => {
  const mockedUseAuth = vi.mocked(useAuth);
  const mockedGetUserSkills = vi.mocked(skillProgressionLib.getUserSkills);
  const mockedCreateSkill = vi.mocked(skillProgressionLib.createSkill);
  const mockedDeleteSkill = vi.mocked(skillProgressionLib.deleteSkill);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" },
    } as any);
  });

  it("loads empty skills", async () => {
    mockedGetUserSkills.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSkills());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.skills).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockedGetUserSkills).toHaveBeenCalledWith("user-1");
  });

  it("loads skills data", async () => {
    mockedGetUserSkills.mockResolvedValueOnce([skillOne, skillTwo] as any);

    const { result } = renderHook(() => useSkills());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.skills).toHaveLength(2);
    expect(result.current.skills[0].id).toBe("skill-1");
    expect(result.current.skills[1].id).toBe("skill-2");
  });

  it("createSkill calls lib create and refresh", async () => {
    mockedGetUserSkills.mockResolvedValue([]);
    mockedCreateSkill.mockResolvedValue(skillOne as any);

    const { result } = renderHook(() => useSkills());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createSkill({
        name: "Deep Work",
        category: "Productivity",
        icon: "Brain",
        color: "#7C3AED",
        unit: "hrs",
        currentValue: 10,
        targetValue: 40,
      });
    });

    expect(mockedCreateSkill).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        name: "Deep Work",
        targetValue: 40,
      }),
    );
  });

  it("deleteSkill calls lib delete and refresh", async () => {
    mockedGetUserSkills.mockResolvedValue([skillOne] as any);
    mockedDeleteSkill.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSkills());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteSkill("skill-1");
    });

    expect(mockedDeleteSkill).toHaveBeenCalledWith("user-1", "skill-1");
  });

  it("sets error when loading fails", async () => {
    mockedGetUserSkills.mockRejectedValueOnce(new Error("load failed"));

    const { result } = renderHook(() => useSkills());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("load failed");
    expect(result.current.skills).toEqual([]);
  });
});
