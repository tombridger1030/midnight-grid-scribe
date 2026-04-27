import { supabase } from "./supabase";

export interface DailyFlow {
  user_id: string;
  date: string;
  flow_score: number | null;
  verdict: string | null;
  model: string | null;
  generated_at: string | null;
}

export async function getFlow(date: string): Promise<DailyFlow | null> {
  const { data, error } = await supabase
    .from("daily_flow")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFlowRange(
  startDate: string,
  endDate: string,
): Promise<DailyFlow[]> {
  const { data, error } = await supabase
    .from("daily_flow")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function scoreToday(date?: string): Promise<DailyFlow | null> {
  const target = date ?? new Date().toISOString().slice(0, 10);
  try {
    const { error } = await supabase.functions.invoke("flow-judge", {
      body: { action: "score_day", date: target },
    });
    if (error) {
      console.warn("flow-judge score_day failed:", error);
      return null;
    }
    return getFlow(target);
  } catch (err) {
    console.warn("flow-judge invoke failed:", err);
    return null;
  }
}
