// flow-judge — three actions:
//   1. judge_block — Sonnet 4.6 reads block + user's "what i did" text, emits
//      quality_score (0-100), quality_verdict (terse 1-line), results_summary
//   2. score_day — Sonnet 4.6 rolls up the day's blocks + inputs into a daily flow_score
//   3. summarize_block (legacy) — Haiku 4.5 cleanup of results_text only
//
// Voice: cold third-person observer, prosecutorial when warranted.

import Anthropic from "npm:@anthropic-ai/sdk@0.71.2";
import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/utils.ts";

const SUMMARY_MODEL = "claude-haiku-4-5";
const JUDGE_MODEL = "claude-sonnet-4-6";

const SUMMARY_SYSTEM = `You compress an operator's freeform "what did you do" text into one
tight lowercase one-liner, ≤80 chars, no period, no quotes. Strip filler.
Keep concrete artifacts and metrics. Refuse to invent. Return only the line.`;

const JUDGE_SYSTEM = `You are a cold judge of an operator's work block. The operator clocked into
a planned block (e.g. "Cortal Block I 07:30–13:00") and clocked out, telling you what they did.
Your job: was that a good use of that block?

Inputs:
  - block.label (the planned activity)
  - block.start_time / end_time (planned window in HH:MM)
  - block.started_at / ended_at (actual clock-in / clock-out timestamps)
  - block.results_text (operator's account of what they did)

Output via emit_judgment tool:
  - results_summary: ONE lowercase one-liner ≤80 chars, no period, the user's text compressed
  - quality_score: integer 0-100
      - 90-100: clearly aligned, substantive output, matched or exceeded the block's intent
      - 70-89: solid alignment, real progress
      - 50-69: partial — distracted, drifted, light output
      - 30-49: mostly off-track or shallow
      - 0-29: wasted — no substantive output OR explicitly off-purpose
  - quality_verdict: ONE lowercase line ≤90 chars, Bloomberg log style.
      - References specific artifacts/metrics if present.
      - Names the misalignment concretely if score is low.
      - No encouragement. No "good job." No emojis.
      - Do NOT include the score in the verdict text — the score is a separate field.
      Examples:
        "shipped migration + edge fn — block aligned"
        "scrolled twitter, no output named"
        "drafted plan, off-purpose for cortal block"

The block label tells you what the operator INTENDED to do. Judge alignment between intent and
what they actually did. Penalize shallow, off-purpose, or unclear output.

Emit via the emit_judgment tool. Do not produce free-form output.`;

const SCORE_DAY_SYSTEM = `You are a cold daily flow judge for an operator.

INPUT: a JSON payload with the operator's day:
  - blocks: each with label, status (captured/missed/active/pending), quality_score (if scored), results_summary
  - inputs: { sleep_hours, sleep_offset_min (avg minutes off target schedule), exercise (Y/N), diet (Y/N) }
  - prior_score: yesterday's flow_score for trend reference

OUTPUT via emit_score:
  - flow_score: integer 0-100 (weighted average of block quality_scores, dampened by inputs:
      sleep_offset_min >60 → -10; <5 hours sleep → -15; diet=N → -5; exercise=N → -3)
  - verdict: ONE lowercase line ≤90 chars, Bloomberg log style. Reference data not feelings.
      Examples:
        "5/6 blocks captured · avg quality 78 · diet slip · 71"
        "2/6 blocks · 4.5h sleep · collapse · 28"

Emit via emit_score tool only. No free-form output.`;

interface BlockData {
  label?: string;
  status?: string;
  results_summary?: string | null;
  quality_score?: number | null;
}

function getAnthropic(): Anthropic {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

async function summarizeBlock(blockId: string, userId: string) {
  const supabase = createServiceClient();
  const { data: block, error } = await supabase
    .from("block_instances")
    .select("id, results_text, results_summary, status, user_id")
    .eq("id", blockId)
    .single();

  if (error || !block) return errorResponse(`block ${blockId} not found`, 404);
  if (block.user_id !== userId) return errorResponse("forbidden", 403);
  if (!block.results_text?.trim())
    return jsonResponse({ skipped: true, reason: "no results_text" });

  const client = getAnthropic();
  const response = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 120,
    system: [
      {
        type: "text",
        text: SUMMARY_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: block.results_text }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const summary = textBlock?.type === "text" ? textBlock.text.trim() : null;
  if (!summary) return errorResponse("no summary returned", 502);

  await supabase
    .from("block_instances")
    .update({ results_summary: summary, status: "captured" })
    .eq("id", blockId);

  return jsonResponse({ block_id: blockId, results_summary: summary });
}

async function judgeBlock(blockId: string, userId: string) {
  const supabase = createServiceClient();
  const { data: block, error } = await supabase
    .from("block_instances")
    .select(
      "id, user_id, status, results_text, results_summary, started_at, ended_at, schedule_blocks(label, start_time, end_time)",
    )
    .eq("id", blockId)
    .single();

  if (error || !block) return errorResponse(`block ${blockId} not found`, 404);
  if (block.user_id !== userId) return errorResponse("forbidden", 403);
  if (!block.results_text?.trim())
    return jsonResponse({ skipped: true, reason: "no results_text" });

  const sb: any = block.schedule_blocks ?? {};
  const payload = {
    block: {
      label: sb.label ?? "ad-hoc",
      planned_start: sb.start_time ?? null,
      planned_end: sb.end_time ?? null,
      started_at: block.started_at,
      ended_at: block.ended_at,
      results_text: block.results_text,
    },
  };

  const client = getAnthropic();
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: JUDGE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "emit_judgment",
        description: "Emit the per-block quality judgment.",
        input_schema: {
          type: "object",
          properties: {
            results_summary: { type: "string", maxLength: 100 },
            quality_score: { type: "integer", minimum: 0, maximum: 100 },
            quality_verdict: { type: "string", maxLength: 120 },
          },
          required: ["results_summary", "quality_score", "quality_verdict"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "emit_judgment" },
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use")
    return errorResponse("model did not emit_judgment", 502);

  const { results_summary, quality_score, quality_verdict } = toolUse.input as {
    results_summary: string;
    quality_score: number;
    quality_verdict: string;
  };

  await supabase
    .from("block_instances")
    .update({
      results_summary,
      quality_score,
      quality_verdict,
      status: "captured",
    })
    .eq("id", blockId);

  return jsonResponse({
    block_id: blockId,
    results_summary,
    quality_score,
    quality_verdict,
  });
}

async function scoreDay(userId: string, dateStr?: string) {
  const supabase = createServiceClient();
  const date = dateStr ?? new Date().toISOString().slice(0, 10);

  const [{ data: blocks }, { data: inputs }, { data: prior }] =
    await Promise.all([
      supabase
        .from("block_instances")
        .select(
          "status, results_summary, quality_score, schedule_blocks(label)",
        )
        .eq("user_id", userId)
        .eq("date", date),
      supabase
        .from("daily_inputs")
        .select("sleep_hours, sleep_sigma_7d, exercise, diet")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle(),
      supabase
        .from("daily_flow")
        .select("flow_score")
        .eq("user_id", userId)
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const payload = {
    date,
    blocks: (blocks ?? []).map((b: any) => ({
      label: b.schedule_blocks?.label ?? "ad-hoc",
      status: b.status,
      results_summary: b.results_summary ?? null,
      quality_score: b.quality_score ?? null,
    })) satisfies BlockData[],
    inputs: {
      sleep_hours: inputs?.sleep_hours ?? null,
      sleep_offset_min: inputs?.sleep_sigma_7d ?? null,
      exercise: inputs?.exercise ?? null,
      diet: inputs?.diet ?? null,
    },
    prior_score: prior?.flow_score ?? null,
  };

  const client = getAnthropic();
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: SCORE_DAY_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "emit_score",
        description: "Emit the daily flow score.",
        input_schema: {
          type: "object",
          properties: {
            flow_score: { type: "integer", minimum: 0, maximum: 100 },
            verdict: { type: "string", maxLength: 120 },
          },
          required: ["flow_score", "verdict"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "emit_score" },
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use")
    return errorResponse("model did not emit_score", 502);

  const { flow_score, verdict } = toolUse.input as {
    flow_score: number;
    verdict: string;
  };

  await supabase.from("daily_flow").upsert(
    {
      user_id: userId,
      date,
      flow_score,
      verdict,
      model: JUDGE_MODEL,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  return jsonResponse({ date, flow_score, verdict });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      return errorResponse("missing bearer token", 401);

    const supabase = createServiceClient();
    const { data: userData } = await supabase.auth.getUser(auth.slice(7));
    const user = userData?.user;
    if (!user) return errorResponse("invalid token", 401);

    const body = await req.json();
    const { action } = body as { action?: string };

    if (action === "judge_block") {
      const { block_id } = body as { block_id?: string };
      if (!block_id) return errorResponse("block_id required", 400);
      return await judgeBlock(block_id, user.id);
    }
    if (action === "summarize_block") {
      const { block_id } = body as { block_id?: string };
      if (!block_id) return errorResponse("block_id required", 400);
      return await summarizeBlock(block_id, user.id);
    }
    if (action === "score_day") {
      const { date } = body as { date?: string };
      return await scoreDay(user.id, date);
    }

    return errorResponse(`unknown action: ${action}`, 400);
  } catch (err) {
    console.error("flow-judge error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "unknown error",
      500,
    );
  }
});
