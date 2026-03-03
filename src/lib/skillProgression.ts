import { supabase } from "./supabase";

export interface SkillCheckpoint {
  id: string;
  name: string;
  targetDate: string;
  isCompleted: boolean;
  progressPercentage: number;
}

export interface SkillData {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  checkpoints: SkillCheckpoint[];
}

export type SkillFormula = "linear" | "threshold" | "exponential";

export interface SkillKPIContribution {
  kpiId: string;
  weight: number;
  formula: SkillFormula;
}

export type CreateSkillInput = Omit<
  SkillData,
  "id" | "progressPercentage" | "checkpoints"
> & {
  checkpoints?: Omit<SkillCheckpoint, "id">[];
};

export type UpdateSkillInput = Partial<SkillData>;

export interface SkillProgressionRow {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string;
  category: string;
  current_level: number | string;
  target_level: number | string;
  progress_data: {
    unit?: string;
    icon?: string;
    color?: string;
    checkpoints?: SkillCheckpoint[];
    progressPercentage?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export const WEEKLY_KPI_SKILL_MAPPING: Record<string, SkillKPIContribution[]> = {
  "net-worth": [
    { kpiId: "deepWorkHours", weight: 35, formula: "linear" },
    { kpiId: "prRequests", weight: 20, formula: "threshold" },
    { kpiId: "contentShipped", weight: 25, formula: "linear" },
    { kpiId: "bugsClosed", weight: 20, formula: "linear" },
  ],
  "jiu-jitsu": [
    { kpiId: "bjjSessions", weight: 60, formula: "linear" },
    { kpiId: "strengthSessions", weight: 20, formula: "linear" },
    { kpiId: "recoverySessions", weight: 20, formula: "threshold" },
  ],
  "cortal-build": [
    { kpiId: "deepWorkHours", weight: 45, formula: "linear" },
    { kpiId: "prRequests", weight: 30, formula: "linear" },
    { kpiId: "bugsClosed", weight: 25, formula: "linear" },
  ],
  "cortal-mrr": [
    { kpiId: "contentShipped", weight: 40, formula: "exponential" },
    { kpiId: "deepWorkHours", weight: 35, formula: "linear" },
    { kpiId: "prRequests", weight: 25, formula: "linear" },
  ],
  "body-composition": [
    { kpiId: "strengthSessions", weight: 35, formula: "linear" },
    { kpiId: "sleepAverage", weight: 30, formula: "threshold" },
    { kpiId: "recoverySessions", weight: 20, formula: "linear" },
    { kpiId: "noCompromises", weight: 15, formula: "exponential" },
  ],
  career: [
    { kpiId: "deepWorkHours", weight: 40, formula: "linear" },
    { kpiId: "prRequests", weight: 30, formula: "threshold" },
    { kpiId: "contentShipped", weight: 30, formula: "linear" },
  ],
  knowledge: [
    { kpiId: "readingPages", weight: 50, formula: "linear" },
    { kpiId: "audiobookPercent", weight: 30, formula: "linear" },
    { kpiId: "deepWorkHours", weight: 20, formula: "threshold" },
  ],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeNumeric = (value: number | string | null | undefined): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const computeSkillProgress = (
  currentValue: number,
  targetValue: number,
): number => {
  if (targetValue <= 0) return 0;
  return clamp((currentValue / targetValue) * 100, 0, 100);
};

const beltNameFromValue = (value: number): string => {
  const beltNames = ["White", "Blue", "Purple", "Brown", "Black"];
  const index = Math.floor(value);

  if (index < 0) return "White Belt";
  if (index >= beltNames.length) return "Black Belt+";
  return `${beltNames[index]} Belt`;
};

const ensureCheckpoint = (checkpoint: SkillCheckpoint): SkillCheckpoint => ({
  id: checkpoint.id,
  name: checkpoint.name,
  targetDate: checkpoint.targetDate,
  isCompleted: checkpoint.isCompleted,
  progressPercentage: clamp(normalizeNumeric(checkpoint.progressPercentage), 0, 100),
});

export function formatSkillValue(skill: SkillData, value: number): string {
  if (skill.unit === "USD") return `$${(value / 1000).toFixed(1)}k`;
  if (skill.unit === "USD/year") return `$${(value / 1000).toFixed(1)}k ARR`;
  if (skill.unit === "belt") return beltNameFromValue(value);
  if (skill.unit === "% BF") return `${value.toFixed(1)}%`;
  return `${value}${skill.unit}`;
}

export function getDaysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export function isDateOverdue(dateStr: string): boolean {
  return getDaysUntilDate(dateStr) < 0;
}

export function deserializeSkillRow(row: SkillProgressionRow): SkillData {
  const progressData = row.progress_data ?? {};
  const currentValue = normalizeNumeric(row.current_level);
  const targetValue = normalizeNumeric(row.target_level);

  const progressPercentage =
    typeof progressData.progressPercentage === "number"
      ? clamp(progressData.progressPercentage, 0, 100)
      : computeSkillProgress(currentValue, targetValue);

  const checkpoints = Array.isArray(progressData.checkpoints)
    ? progressData.checkpoints.map(ensureCheckpoint)
    : [];

  return {
    id: row.skill_id,
    name: row.skill_name,
    category: row.category,
    icon: progressData.icon || "TrendingUp",
    color: progressData.color || "#5FE3B3",
    unit: progressData.unit || "",
    currentValue,
    targetValue,
    progressPercentage,
    checkpoints,
  };
}

export function serializeSkillForUpsert(
  userId: string,
  skill: SkillData,
): Omit<SkillProgressionRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    skill_id: skill.id,
    skill_name: skill.name,
    category: skill.category,
    current_level: skill.currentValue,
    target_level: skill.targetValue,
    progress_data: {
      unit: skill.unit,
      icon: skill.icon,
      color: skill.color,
      checkpoints: skill.checkpoints.map(ensureCheckpoint),
      progressPercentage: skill.progressPercentage,
    },
  };
}

function createSkillId(name: string): string {
  return `${name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
}

export async function getUserSkills(userId: string): Promise<SkillData[]> {
  const { data, error } = await supabase
    .from("skill_progression")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching user skills:", error);
    return [];
  }

  return (data || []).map((row) =>
    deserializeSkillRow(row as SkillProgressionRow),
  );
}

export async function createSkill(
  userId: string,
  input: CreateSkillInput,
): Promise<SkillData> {
  const skill: SkillData = {
    id: createSkillId(input.name),
    name: input.name,
    category: input.category,
    icon: input.icon,
    color: input.color,
    unit: input.unit,
    currentValue: normalizeNumeric(input.currentValue),
    targetValue: normalizeNumeric(input.targetValue),
    progressPercentage: computeSkillProgress(
      normalizeNumeric(input.currentValue),
      normalizeNumeric(input.targetValue),
    ),
    checkpoints: (input.checkpoints || []).map((checkpoint, index) =>
      ensureCheckpoint({
        ...checkpoint,
        id: `${input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}-cp-${index + 1}-${Date.now().toString(36)}`,
      }),
    ),
  };

  const payload = serializeSkillForUpsert(userId, skill);
  const { data, error } = await supabase
    .from("skill_progression")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating skill:", error);
    throw error;
  }

  return deserializeSkillRow(data as SkillProgressionRow);
}

export async function updateSkill(
  userId: string,
  skillId: string,
  updates: UpdateSkillInput,
): Promise<SkillData> {
  const { data: existingRow, error: existingError } = await supabase
    .from("skill_progression")
    .select("*")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .single();

  if (existingError) {
    console.error("Error fetching skill before update:", existingError);
    throw existingError;
  }

  const existingSkill = deserializeSkillRow(existingRow as SkillProgressionRow);
  const merged: SkillData = {
    ...existingSkill,
    ...updates,
    id: skillId,
    checkpoints: updates.checkpoints
      ? updates.checkpoints.map(ensureCheckpoint)
      : existingSkill.checkpoints,
  };

  merged.progressPercentage =
    typeof updates.progressPercentage === "number"
      ? clamp(updates.progressPercentage, 0, 100)
      : computeSkillProgress(
          normalizeNumeric(merged.currentValue),
          normalizeNumeric(merged.targetValue),
        );

  const payload = serializeSkillForUpsert(userId, merged);

  const { data, error } = await supabase
    .from("skill_progression")
    .update(payload)
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating skill:", error);
    throw error;
  }

  return deserializeSkillRow(data as SkillProgressionRow);
}

export async function deleteSkill(userId: string, skillId: string): Promise<void> {
  const { error } = await supabase
    .from("skill_progression")
    .delete()
    .eq("user_id", userId)
    .eq("skill_id", skillId);

  if (error) {
    console.error("Error deleting skill:", error);
    throw error;
  }
}
