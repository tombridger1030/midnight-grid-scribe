import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreateSkillInput,
  SkillCheckpoint,
  SkillData,
  UpdateSkillInput,
  createSkill as createUserSkill,
  deleteSkill as deleteUserSkill,
  getUserSkills,
  updateSkill as updateUserSkill,
} from "@/lib/skillProgression";

interface UseSkillsResult {
  skills: SkillData[];
  isLoading: boolean;
  error: string | null;
  createSkill: (input: CreateSkillInput) => Promise<void>;
  updateSkill: (skillId: string, updates: UpdateSkillInput) => Promise<void>;
  deleteSkill: (skillId: string) => Promise<void>;
  addCheckpoint: (
    skillId: string,
    checkpoint: Omit<SkillCheckpoint, "id">,
  ) => Promise<void>;
  markCheckpointComplete: (skillId: string, checkpointId: string) => Promise<void>;
  refresh: () => Promise<void>;
  overallProgress: number;
  overdueCount: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const recomputeProgress = (skill: SkillData): SkillData => {
  const progressPercentage =
    skill.targetValue > 0
      ? clamp((skill.currentValue / skill.targetValue) * 100, 0, 100)
      : 0;

  return {
    ...skill,
    progressPercentage,
  };
};

export function useSkills(): UseSkillsResult {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSkills([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedSkills = await getUserSkills(user.id);
      setSkills(loadedSkills.map(recomputeProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSkill = useCallback(
    async (input: CreateSkillInput) => {
      if (!user?.id) return;
      setError(null);

      try {
        await createUserSkill(user.id, input);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create skill");
      }
    },
    [refresh, user?.id],
  );

  const updateSkill = useCallback(
    async (skillId: string, updates: UpdateSkillInput) => {
      if (!user?.id) return;
      setError(null);

      try {
        await updateUserSkill(user.id, skillId, updates);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update skill");
      }
    },
    [refresh, user?.id],
  );

  const deleteSkill = useCallback(
    async (skillId: string) => {
      if (!user?.id) return;
      setError(null);

      try {
        await deleteUserSkill(user.id, skillId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete skill");
      }
    },
    [refresh, user?.id],
  );

  const addCheckpoint = useCallback(
    async (skillId: string, checkpoint: Omit<SkillCheckpoint, "id">) => {
      const skill = skills.find((s) => s.id === skillId);
      if (!skill) return;

      const nextCheckpoint: SkillCheckpoint = {
        ...checkpoint,
        id: `${skillId}-cp-${Date.now().toString(36)}`,
      };

      await updateSkill(skillId, {
        checkpoints: [...skill.checkpoints, nextCheckpoint],
      });
    },
    [skills, updateSkill],
  );

  const markCheckpointComplete = useCallback(
    async (skillId: string, checkpointId: string) => {
      const skill = skills.find((s) => s.id === skillId);
      if (!skill) return;

      const checkpoints = skill.checkpoints.map((checkpoint) =>
        checkpoint.id === checkpointId
          ? { ...checkpoint, isCompleted: true }
          : checkpoint,
      );

      await updateSkill(skillId, { checkpoints });
    },
    [skills, updateSkill],
  );

  const overallProgress = useMemo(() => {
    if (skills.length === 0) return 0;
    const total = skills.reduce((sum, skill) => sum + skill.progressPercentage, 0);
    return total / skills.length;
  }, [skills]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return skills.reduce((count, skill) => {
      const overdueInSkill = skill.checkpoints.filter((checkpoint) => {
        if (checkpoint.isCompleted) return false;
        const date = new Date(checkpoint.targetDate);
        date.setHours(0, 0, 0, 0);
        return date.getTime() < today.getTime();
      }).length;

      return count + overdueInSkill;
    }, 0);
  }, [skills]);

  return {
    skills,
    isLoading,
    error,
    createSkill,
    updateSkill,
    deleteSkill,
    addCheckpoint,
    markCheckpointComplete,
    refresh,
    overallProgress,
    overdueCount,
  };
}

export default useSkills;
