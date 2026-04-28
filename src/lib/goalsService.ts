import { supabase } from "./supabase";

export type GoalStatus = "on_track" | "at_risk" | "hit" | "missed";

export interface MonthlyGoal {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-01
  claim: string;
  success_criteria: string;
  threshold_numeric: number | null;
  current_value: number | null;
  status: GoalStatus;
  judged_at: string | null;
  created_at: string;
}

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function listGoalsForMonth(
  monthDate?: string,
): Promise<MonthlyGoal[]> {
  const month = monthDate ?? monthKey();
  const { data, error } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("month", month)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(input: {
  claim: string;
  success_criteria: string;
  threshold_numeric?: number | null;
  month?: string;
}): Promise<MonthlyGoal> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("monthly_goals")
    .insert({
      user_id: u.user.id,
      month: input.month ?? monthKey(),
      claim: input.claim,
      success_criteria: input.success_criteria,
      threshold_numeric: input.threshold_numeric ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(
  id: string,
  patch: Partial<
    Pick<
      MonthlyGoal,
      | "claim"
      | "success_criteria"
      | "threshold_numeric"
      | "current_value"
      | "status"
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from("monthly_goals")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("monthly_goals").delete().eq("id", id);
  if (error) throw error;
}

export function daysRemainingInMonth(date = new Date()): number {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return last - date.getDate();
}

export function monthLabel(date = new Date()): string {
  return date
    .toLocaleString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}
