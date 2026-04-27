// flow-judge — single edge function with two actions:
//   1. summarize_block — Haiku 4.5 rewrites a block's results_text into a tight one-liner
//   2. score_day      — Sonnet 4.6 reads the day's blocks + daily_inputs, emits flow_score + verdict
//
// Voice: cold third-person observer, prosecutorial when warranted, references data not feelings.

import Anthropic from "npm:@anthropic-ai/sdk@0.71.2";
import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/utils.ts";

const SUMMARY_MODEL = "claude-haiku-4-5";
const SCORE_MODEL = "claude-sonnet-4-6";

const SUMMARY_SYSTEM = `You are a Bloomberg-terminal-style log compressor for an operator's daily work blocks.
Given the operator's raw freeform "what did you accomplish" text, return a single tight one-liner
in lowercase, no period, ≤80 chars. Strip filler. Keep concrete artifacts/metrics. Refuse to add
information that isn't in the input. Examples:
  raw: "Worked on the new auth flow, got the OAuth callback to work after debugging for an hour"
  out: shipped oauth callback, debugged 1h
  raw: "Just answered emails and stuff"
  out: email triage
Return only the one-liner, no quotes, no preface.`;

const SCORE_SYSTEM = `You are a cold, prosecutorial daily flow judge for an operator.

INPUT: a JSON payload with the operator's day:
  - schedule (planned blocks)
  - blocks (each with status: captured/missed and the results_summary if captured)
  - inputs: { sleep_hours, sleep_sigma_7d, exercise (Y/N), diet (Y/N) }
  - prior_score: yesterday's flow_score for trend reference

OUTPUT via emit_score tool with two fields:
  - flow_score: integer 0-100
    - 90-100: every block captured with substantive output, sleep ≥7h variance ≤0.5, exercise + diet
    - 70-89: most blocks captured, one input slip
    - 50-69: meaningful blocks missed OR multiple input slips
    - 30-49: half the day lost OR poor sleep undermining everything
    - 0-29: collapse — most blocks missed, sleep <5h, multiple slips
  - verdict: ONE terse line in Bloomberg log style. Lowercase. ≤90 chars.
    - References specific data, not feelings.
    - Names what slipped concretely. No encouragement. No celebration.
    - Examples:
      "4/4 blocks captured · σ7 0.4 · 87"
      "diet slip · 2/3 blocks · 54"
      "5.9h sleep · 1/4 blocks · poor recovery · 34"
      "full capture · 91"

Emit via the emit_score tool. Do not produce free-form output.`;

interface BlockData {
  label?: string;
  status: string;
  results_summary?: string | null;
  results_text?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

interface DailyInputs {
  sleep_hours?: number | null;
  sleep_sigma_7d?: number | null;
  exercise?: boolean | null;
  diet?: boolean | null;
}

function getAnthropic(): Anthropic {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey)
    throw new Error("ANTHROPIC_API_KEY not set in edge function secrets");
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
  if (!block.results_text || block.results_text.trim().length === 0) {
    return jsonResponse({ skipped: true, reason: "no results_text" });
  }
  if (block.results_summary) {
    return jsonResponse({
      skipped: true,
      reason: "already summarized",
      results_summary: block.results_summary,
    });
  }

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
  if (!summary) return errorResponse("no summary returned from model", 502);

  await supabase
    .from("block_instances")
    .update({ results_summary: summary, status: "captured" })
    .eq("id", blockId);

  return jsonResponse({ block_id: blockId, results_summary: summary });
}

async function scoreDay(userId: string, dateStr?: string) {
  const supabase = createServiceClient();
  const date = dateStr ?? new Date().toISOString().slice(0, 10);

  const [{ data: blocks }, { data: inputs }, { data: prior }] =
    await Promise.all([
      supabase
        .from("block_instances")
        .select(
          "id, status, results_summary, results_text, started_at, ended_at, schedule_blocks(label, start_time, end_time)",
        )
        .eq("user_id", userId)
        .eq("date", date),
      supabase
        .from("daily_inputs")
        .select("*")
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
      start_time: b.schedule_blocks?.start_time ?? null,
      end_time: b.schedule_blocks?.end_time ?? null,
    })),
    inputs: {
      sleep_hours: inputs?.sleep_hours ?? null,
      sleep_sigma_7d: inputs?.sleep_sigma_7d ?? null,
      exercise: inputs?.exercise ?? null,
      diet: inputs?.diet ?? null,
    } as DailyInputs,
    prior_score: prior?.flow_score ?? null,
  };

  const client = getAnthropic();
  const response = await client.messages.create({
    model: SCORE_MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: SCORE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "emit_score",
        description: "Emit the flow score and verdict for the day.",
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

  await supabase
    .from("daily_flow")
    .upsert(
      {
        user_id: userId,
        date,
        flow_score,
        verdict,
        model: SCORE_MODEL,
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
