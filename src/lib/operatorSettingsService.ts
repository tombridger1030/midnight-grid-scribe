import { supabase } from "./supabase";

export interface OperatorSettings {
  user_id: string;
  target_bedtime: string; // HH:MM:SS
  target_wake_time: string; // HH:MM:SS
  diet_definition: string | null;
  exercise_definition: string | null;
}

export async function getOperatorSettings(): Promise<OperatorSettings | null> {
  const { data, error } = await supabase
    .from("operator_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertOperatorSettings(
  patch: Partial<
    Pick<
      OperatorSettings,
      | "target_bedtime"
      | "target_wake_time"
      | "diet_definition"
      | "exercise_definition"
    >
  >,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { error } = await supabase
    .from("operator_settings")
    .upsert({ user_id: u.user.id, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}
