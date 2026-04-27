import { supabase } from "./supabase";

export interface ScheduleBlock {
  id: string;
  user_id: string;
  label: string;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  days_of_week: number[]; // 0=Sun..6=Sat
  archived_at: string | null;
  created_at: string;
}

export async function listActiveBlocks(): Promise<ScheduleBlock[]> {
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("*")
    .is("archived_at", null)
    .order("start_time");
  if (error) throw error;
  return data ?? [];
}

export async function createBlock(input: {
  label: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}): Promise<ScheduleBlock> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert({ ...input, user_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlock(
  id: string,
  input: Partial<
    Pick<ScheduleBlock, "label" | "start_time" | "end_time" | "days_of_week">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("schedule_blocks")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function archiveBlock(id: string): Promise<void> {
  const { error } = await supabase
    .from("schedule_blocks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
