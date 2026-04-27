import { supabase } from "./supabase";

export interface BlockInstance {
  id: string;
  user_id: string;
  block_id: string | null;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  results_text: string | null;
  results_summary: string | null;
  status: "pending" | "captured" | "missed" | "adhoc";
  schedule_blocks?: {
    label: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface BlockInstanceWithLabel extends BlockInstance {
  label: string;
  start_time: string | null;
  end_time: string | null;
}

function joinLabel(b: BlockInstance): BlockInstanceWithLabel {
  return {
    ...b,
    label: b.schedule_blocks?.label ?? "ad-hoc",
    start_time: b.schedule_blocks?.start_time ?? null,
    end_time: b.schedule_blocks?.end_time ?? null,
  };
}

export async function listForDate(
  date: string,
): Promise<BlockInstanceWithLabel[]> {
  const { data, error } = await supabase
    .from("block_instances")
    .select("*, schedule_blocks(label, start_time, end_time)")
    .eq("date", date)
    .order("started_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const sorted = (data ?? []).map(joinLabel);
  // Sort by start_time when available, otherwise by started_at
  sorted.sort((a, b) => {
    const aTime = a.start_time ?? a.started_at ?? "";
    const bTime = b.start_time ?? b.started_at ?? "";
    return aTime.localeCompare(bTime);
  });
  return sorted;
}

export async function captureResults(
  blockInstanceId: string,
  resultsText: string,
): Promise<{ results_summary: string | null }> {
  const trimmed = resultsText.trim();
  if (!trimmed) throw new Error("results required");

  // Save raw text + mark started/ended timestamps if missing
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("block_instances")
    .update({
      results_text: trimmed,
      ended_at: now,
      status: "captured",
    })
    .eq("id", blockInstanceId);
  if (error) throw error;

  // Fire-and-forget AI summarization (best-effort)
  try {
    const { data, error: fnError } = await supabase.functions.invoke(
      "flow-judge",
      {
        body: { action: "summarize_block", block_id: blockInstanceId },
      },
    );
    if (fnError) {
      console.warn("flow-judge summarize_block failed:", fnError);
      return { results_summary: null };
    }
    return {
      results_summary:
        (data as { results_summary?: string })?.results_summary ?? null,
    };
  } catch (err) {
    console.warn("flow-judge invoke failed:", err);
    return { results_summary: null };
  }
}

export async function markMissed(blockInstanceId: string): Promise<void> {
  const { error } = await supabase
    .from("block_instances")
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("id", blockInstanceId);
  if (error) throw error;
}

export async function createAdhoc(input: {
  date: string;
  results_text: string;
}): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("block_instances")
    .insert({
      user_id: u.user.id,
      date: input.date,
      status: "adhoc",
      results_text: input.results_text.trim(),
      started_at: now,
      ended_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Find the next block needing capture: pending status with end_time already passed.
 * Returns null if none.
 */
export function findEndedPending(
  blocks: BlockInstanceWithLabel[],
): BlockInstanceWithLabel | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const b of blocks) {
    if (b.status !== "pending" || b.date !== today || !b.end_time) continue;
    const [h, m] = b.end_time.split(":").map(Number);
    const endMinutes = (h ?? 0) * 60 + (m ?? 0);
    if (nowMinutes >= endMinutes) return b;
  }
  return null;
}

/**
 * Find the currently active block (now between start_time and end_time, status pending).
 */
export function findActive(
  blocks: BlockInstanceWithLabel[],
): BlockInstanceWithLabel | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const b of blocks) {
    if (
      b.status !== "pending" ||
      b.date !== today ||
      !b.start_time ||
      !b.end_time
    )
      continue;
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    const start = (sh ?? 0) * 60 + (sm ?? 0);
    const end = (eh ?? 0) * 60 + (em ?? 0);
    if (nowMinutes >= start && nowMinutes < end) return b;
  }
  return null;
}
