// operator-cron — nightly tasks (run via Supabase scheduled function or pg_cron):
//   1. compute sleep_sigma_7d for every user with daily_inputs in the last 7d
//   2. for each user, materialize today's block_instances from their schedule_blocks
//   3. refresh monthly_goals.status (basic: numeric goals → threshold check)
//
// Idempotent — safe to run multiple times per day.

import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/utils.ts";

async function computeSleepSigma(
  supabase: ReturnType<typeof createServiceClient>,
  today: string,
) {
  // Find all users with input in last 7 days, recompute σ7 for today's row
  const { data: users } = await supabase
    .from("daily_inputs")
    .select("user_id")
    .gte(
      "date",
      new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10),
    )
    .not("sleep_hours", "is", null);

  const uniqueUsers = Array.from(
    new Set((users ?? []).map((u: any) => u.user_id)),
  );
  let updated = 0;

  for (const userId of uniqueUsers) {
    const { data } = await supabase.rpc("compute_sleep_sigma_7d", {
      target_user: userId,
      target_date: today,
    });
    const sigma = data as number | null;
    if (sigma === null) continue;

    // Upsert sigma into today's daily_inputs row (if exists; otherwise skip — input row required first)
    await supabase
      .from("daily_inputs")
      .update({ sleep_sigma_7d: sigma })
      .eq("user_id", userId)
      .eq("date", today);
    updated++;
  }

  return { sleep_sigma_updated: updated };
}

async function materializeBlockInstances(
  supabase: ReturnType<typeof createServiceClient>,
  today: string,
) {
  const dayOfWeek = new Date(today + "T00:00:00").getUTCDay(); // 0=Sun..6=Sat

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, user_id, days_of_week")
    .is("archived_at", null);

  let created = 0;
  for (const b of blocks ?? []) {
    if (!Array.isArray(b.days_of_week) || !b.days_of_week.includes(dayOfWeek))
      continue;

    // Idempotent: insert if not already there
    const { data: existing } = await supabase
      .from("block_instances")
      .select("id")
      .eq("user_id", b.user_id)
      .eq("block_id", b.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("block_instances").insert({
      user_id: b.user_id,
      block_id: b.id,
      date: today,
      status: "pending",
    });
    created++;
  }

  return { block_instances_created: created };
}

async function refreshMonthlyGoals(
  supabase: ReturnType<typeof createServiceClient>,
  today: string,
) {
  const monthStart = today.slice(0, 7) + "-01";

  const { data: goals } = await supabase
    .from("monthly_goals")
    .select("id, threshold_numeric, current_value, status")
    .eq("month", monthStart);

  const lastDayOfMonth = new Date(
    parseInt(today.slice(0, 4)),
    parseInt(today.slice(5, 7)),
    0,
  ).getDate();
  const today_dom = parseInt(today.slice(8, 10));
  const monthFraction = today_dom / lastDayOfMonth;

  let updated = 0;
  for (const g of goals ?? []) {
    if (g.status === "hit" || g.status === "missed") continue;
    if (g.threshold_numeric === null || g.current_value === null) continue;

    const progress =
      (g.current_value as number) / (g.threshold_numeric as number);
    let nextStatus: string;

    if (progress >= 1) nextStatus = "hit";
    else if (progress >= monthFraction * 0.85) nextStatus = "on_track";
    else nextStatus = "at_risk";

    if (nextStatus !== g.status) {
      await supabase
        .from("monthly_goals")
        .update({ status: nextStatus })
        .eq("id", g.id);
      updated++;
    }
  }

  return { goals_updated: updated };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);

    const [sigma, blocks, goals] = await Promise.all([
      computeSleepSigma(supabase, today),
      materializeBlockInstances(supabase, today),
      refreshMonthlyGoals(supabase, today),
    ]);

    return jsonResponse({ date: today, ...sigma, ...blocks, ...goals });
  } catch (err) {
    console.error("operator-cron error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "unknown error",
      500,
    );
  }
});
