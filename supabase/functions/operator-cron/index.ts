// operator-cron — nightly tasks (run via Supabase scheduled function or pg_cron):
//   1. for each user, materialize today's block_instances from their schedule_blocks
//   2. refresh monthly_goals.status (basic: numeric goals → threshold check)
//
// Idempotent — safe to run multiple times per day.
// Accepts an explicit YYYY-MM-DD date from the caller; otherwise it falls back
// to the configured mission timezone so scheduled runs stay aligned with the UI.

import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/utils.ts";

const DEFAULT_TIME_ZONE = Deno.env.get("MISSION_CONTROL_TIMEZONE") ?? "America/Vancouver";

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("failed to format date");
  return `${year}-${month}-${day}`;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

async function materializeBlockInstances(
  supabase: ReturnType<typeof createServiceClient>,
  today: string,
) {
  const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat

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
    const body = (await req.json().catch(() => ({}))) as {
      date?: unknown;
      timeZone?: unknown;
    };
    const timeZone =
      typeof body.timeZone === "string" && body.timeZone.trim()
        ? body.timeZone.trim()
        : DEFAULT_TIME_ZONE;
    const today = isIsoDate(body.date)
      ? body.date
      : formatDateInTimeZone(new Date(), timeZone);

    const [blocks, goals] = await Promise.all([
      materializeBlockInstances(supabase, today),
      refreshMonthlyGoals(supabase, today),
    ]);

    return jsonResponse({ date: today, ...blocks, ...goals });
  } catch (err) {
    console.error("operator-cron error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "unknown error",
      500,
    );
  }
});
