import { supabase } from "./supabase";

export interface DailyInputs {
  user_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_sigma_7d: number | null;
  sleep_source: "whoop" | "self" | null;
  exercise: boolean | null;
  diet: boolean | null;
}

export async function getInputs(date: string): Promise<DailyInputs | null> {
  const { data, error } = await supabase
    .from("daily_inputs")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getInputsRange(
  startDate: string,
  endDate: string,
): Promise<DailyInputs[]> {
  const { data, error } = await supabase
    .from("daily_inputs")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function upsertField(
  date: string,
  patch: Partial<
    Pick<DailyInputs, "sleep_hours" | "sleep_source" | "exercise" | "diet">
  >,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { error } = await supabase
    .from("daily_inputs")
    .upsert(
      { user_id: u.user.id, date, ...patch },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

export async function setSleepHours(
  date: string,
  hours: number | null,
): Promise<void> {
  return upsertField(date, { sleep_hours: hours, sleep_source: "self" });
}

export async function setExercise(
  date: string,
  value: boolean | null,
): Promise<void> {
  return upsertField(date, { exercise: value });
}

export async function setDiet(
  date: string,
  value: boolean | null,
): Promise<void> {
  return upsertField(date, { diet: value });
}
