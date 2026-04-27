import { supabase } from "./supabase";

export type BlockStatus =
  | "pending"
  | "active"
  | "captured"
  | "missed"
  | "adhoc"
  | "skipped";

export type BlockKind = "routine" | "note" | "judged";

export interface BlockInstance {
  id: string;
  user_id: string;
  block_id: string | null;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  results_text: string | null;
  results_summary: string | null;
  quality_score: number | null;
  quality_verdict: string | null;
  status: BlockStatus;
  schedule_blocks?: {
    label: string;
    start_time: string;
    end_time: string;
    kind: BlockKind;
  } | null;
}

export interface BlockInstanceWithLabel extends BlockInstance {
  label: string;
  start_time: string | null;
  end_time: string | null;
  kind: BlockKind;
}

function joinLabel(b: BlockInstance): BlockInstanceWithLabel {
  return {
    ...b,
    label: b.schedule_blocks?.label ?? "ad-hoc",
    start_time: b.schedule_blocks?.start_time ?? null,
    end_time: b.schedule_blocks?.end_time ?? null,
    kind: b.schedule_blocks?.kind ?? "judged",
  };
}

export async function listForDate(
  date: string,
): Promise<BlockInstanceWithLabel[]> {
  const { data, error } = await supabase
    .from("block_instances")
    .select("*, schedule_blocks(label, start_time, end_time, kind)")
    .eq("date", date);
  if (error) throw error;
  const rows = (data ?? []).map(joinLabel);
  rows.sort((a, b) => {
    const aTime = a.start_time ?? a.started_at ?? "99:99";
    const bTime = b.start_time ?? b.started_at ?? "99:99";
    return aTime.localeCompare(bTime);
  });
  return rows;
}

/** Clock in: mark a pending block as active with started_at = now. */
export async function clockIn(blockInstanceId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("block_instances")
    .update({ started_at: now, status: "active" })
    .eq("id", blockInstanceId);
  if (error) throw error;
}

/**
 * Clock out behavior depends on block kind:
 *   routine — instant clock-out, no text, no LLM
 *   note    — save text, no LLM
 *   judged  — save text + invoke LLM judge → quality_score + verdict
 */
export async function clockOut(
  blockInstanceId: string,
  kind: BlockKind,
  resultsText: string,
): Promise<{ quality_score: number | null; quality_verdict: string | null }> {
  const trimmed = resultsText.trim();
  if (kind !== "routine" && !trimmed) throw new Error("results required");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("block_instances")
    .update({
      results_text: kind === "routine" ? null : trimmed,
      ended_at: now,
      status: "captured",
    })
    .eq("id", blockInstanceId);
  if (error) throw error;

  if (kind !== "judged") {
    return { quality_score: null, quality_verdict: null };
  }

  try {
    const { data, error: fnError } = await supabase.functions.invoke(
      "flow-judge",
      {
        body: { action: "judge_block", block_id: blockInstanceId },
      },
    );
    if (fnError) {
      console.warn("flow-judge judge_block failed:", fnError);
      return { quality_score: null, quality_verdict: null };
    }
    const r = data as { quality_score?: number; quality_verdict?: string };
    return {
      quality_score: r.quality_score ?? null,
      quality_verdict: r.quality_verdict ?? null,
    };
  } catch (err) {
    console.warn("flow-judge invoke failed:", err);
    return { quality_score: null, quality_verdict: null };
  }
}

export async function markMissed(blockInstanceId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("block_instances")
    .update({ status: "missed", ended_at: now })
    .eq("id", blockInstanceId);
  if (error) throw error;
}

export async function markSkipped(blockInstanceId: string): Promise<void> {
  const { error } = await supabase
    .from("block_instances")
    .update({ status: "skipped" })
    .eq("id", blockInstanceId);
  if (error) throw error;
}

/** Find the currently clocked-in (active) block, if any. */
export function findActiveBlock(
  blocks: BlockInstanceWithLabel[],
): BlockInstanceWithLabel | null {
  return blocks.find((b) => b.status === "active") ?? null;
}
