// accountability-digest — sends a Bloomberg-style plain-text digest to one
// configured recipient at 06:00 local with yesterday's data. Off until the
// user adds a recipient email in /settings.
//
// Two invocation modes:
//   - cron: scheduled run, fans out to all enabled recipients globally
//   - manual: { user_id } body, used for "send now" testing in /settings

import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/utils.ts";

const RESEND_API = "https://api.resend.com/emails";

interface DigestData {
  date: string;
  flow_score: number | null;
  flow_avg_7d: number | null;
  verdict: string | null;
  sleep_hours: number | null;
  exercise: boolean | null;
  diet: boolean | null;
  blocks: { label: string; status: string; results_summary: string | null }[];
  goals: { claim: string; status: string }[];
  goals_month_label: string;
  goals_days_remaining: number;
  user_label: string;
}

function formatBoolean(v: boolean | null): string {
  if (v === null) return "·";
  return v ? "Y" : "N";
}

function formatNumber(v: number | null, suffix = ""): string {
  if (v === null || v === undefined) return "·";
  return `${v}${suffix}`;
}

function buildSubject(d: DigestData): string {
  const dateShort = d.date.slice(5).replace("-", " ");
  const flow = d.flow_score ?? "—";
  const sleep = d.sleep_hours ? `${d.sleep_hours}` : "·";
  const captured = d.blocks.filter((b) => b.status === "captured").length;
  const total = d.blocks.length;
  const dietGlyph = d.diet === false ? "✗" : d.diet === true ? "✓" : "·";
  const exGlyph = d.exercise === false ? "✗" : d.exercise === true ? "✓" : "·";
  return `${d.user_label.toLowerCase()} · ${dateShort} · flow ${flow} · sleep ${sleep} · diet ${dietGlyph} · ex ${exGlyph} · ${captured}/${total} blocks`;
}

function buildBody(d: DigestData): string {
  const dateLong = new Date(d.date + "T00:00:00").toUTCString().slice(0, 16);
  const flowDelta =
    d.flow_score !== null && d.flow_avg_7d !== null
      ? (() => {
          const diff = d.flow_score - Math.round(d.flow_avg_7d);
          if (diff === 0) return "";
          const arrow = diff > 0 ? "▲" : "▼";
          return `   ${arrow} ${Math.abs(diff)} vs 7d avg`;
        })()
      : "";

  const lines: string[] = [];
  lines.push(`NOCTISIUM DAILY · ${d.user_label.toUpperCase()} · ${dateLong}`);
  lines.push("");
  lines.push(`  FLOW              ${formatNumber(d.flow_score)}${flowDelta}`);
  lines.push(`  SLEEP             ${formatNumber(d.sleep_hours, "H")}`);
  lines.push(`  EXERCISE          ${formatBoolean(d.exercise)}`);
  lines.push(
    `  DIET              ${formatBoolean(d.diet)}${d.diet === false ? "    (slipped)" : ""}`,
  );
  lines.push("");

  if (d.blocks.length > 0) {
    lines.push("  BLOCKS");
    for (const b of d.blocks) {
      const label = b.label.padEnd(15).slice(0, 15);
      if (b.status === "captured") {
        lines.push(`    ${label} captured · "${b.results_summary ?? ""}"`);
      } else {
        lines.push(`    ${label} ${b.status}`);
      }
    }
    lines.push("");
  }

  if (d.verdict) {
    lines.push(`  VERDICT           ${d.verdict}`);
    lines.push("");
  }

  if (d.goals.length > 0) {
    lines.push(`  MONTH GOALS · ${d.goals_month_label.toUpperCase()}`);
    for (const g of d.goals) {
      const claim = g.claim.padEnd(34).slice(0, 34);
      lines.push(`    ${claim}${g.status.toUpperCase().replace("_", " ")}`);
    }
    lines.push("");
    lines.push(`  ${d.goals_days_remaining} days remaining in month`);
  }

  return lines.join("\n");
}

async function gatherDigestData(
  userId: string,
  dateStr: string,
): Promise<DigestData | null> {
  const supabase = createServiceClient();

  const [
    { data: profile },
    { data: flow },
    { data: inputs },
    { data: blocks },
    { data: priorFlow },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("daily_flow")
      .select("flow_score, verdict")
      .eq("user_id", userId)
      .eq("date", dateStr)
      .maybeSingle(),
    supabase
      .from("daily_inputs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", dateStr)
      .maybeSingle(),
    supabase
      .from("block_instances")
      .select("status, results_summary, schedule_blocks(label, start_time)")
      .eq("user_id", userId)
      .eq("date", dateStr),
    supabase
      .from("daily_flow")
      .select("flow_score")
      .eq("user_id", userId)
      .lt("date", dateStr)
      .gte(
        "date",
        new Date(new Date(dateStr).getTime() - 7 * 86400000)
          .toISOString()
          .slice(0, 10),
      )
      .order("date", { ascending: false }),
    supabase
      .from("monthly_goals")
      .select("claim, status, month")
      .eq("user_id", userId)
      .eq("month", dateStr.slice(0, 7) + "-01"),
  ]);

  if (!flow && (!blocks || blocks.length === 0) && !inputs) return null;

  const flowAvg7d =
    priorFlow && priorFlow.length > 0
      ? priorFlow.reduce((a: number, b: any) => a + (b.flow_score ?? 0), 0) /
        priorFlow.length
      : null;

  const sortedBlocks = (blocks ?? [])
    .map((b: any) => ({
      label: b.schedule_blocks?.label ?? "ad-hoc",
      status: b.status,
      results_summary: b.results_summary ?? null,
      start_time: b.schedule_blocks?.start_time ?? "00:00",
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map(({ start_time: _start_time, ...rest }) => rest);

  const monthLabel =
    new Date(dateStr + "T00:00:00").toLocaleString("en-US", {
      month: "short",
    }) +
    " " +
    dateStr.slice(0, 4);
  const lastDay = new Date(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)),
    0,
  ).getDate();
  const todayDay = parseInt(dateStr.slice(8, 10));
  const daysRemaining = lastDay - todayDay;

  return {
    date: dateStr,
    flow_score: flow?.flow_score ?? null,
    flow_avg_7d: flowAvg7d,
    verdict: flow?.verdict ?? null,
    sleep_hours: inputs?.sleep_hours ?? null,
    exercise: inputs?.exercise ?? null,
    diet: inputs?.diet ?? null,
    blocks: sortedBlocks,
    goals: (goals ?? []).map((g: any) => ({
      claim: g.claim,
      status: g.status,
    })),
    goals_month_label: monthLabel,
    goals_days_remaining: daysRemaining,
    user_label: profile?.display_name ?? "operator",
  };
}

async function sendDigest(
  recipientId: string,
  userId: string,
  dateStr: string,
) {
  const supabase = createServiceClient();
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromAddr =
    Deno.env.get("RESEND_FROM") ?? "noctisium <noreply@noctisium.com>";

  const { data: recipient } = await supabase
    .from("accountability_recipients")
    .select("email, enabled")
    .eq("id", recipientId)
    .maybeSingle();

  if (!recipient || !recipient.enabled)
    return { skipped: true, reason: "recipient disabled" };

  const data = await gatherDigestData(userId, dateStr);
  if (!data) return { skipped: true, reason: "no data for date" };

  const subject = buildSubject(data);
  const body = buildBody(data);

  if (!apiKey) {
    // No API key — log only (dev mode)
    await supabase.from("accountability_sends").insert({
      recipient_id: recipientId,
      subject,
      send_status: "failed",
      error: "RESEND_API_KEY not set",
    });
    return { sent: false, reason: "no api key" };
  }

  const resp = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [recipient.email],
      subject,
      text: body,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    await supabase.from("accountability_sends").insert({
      recipient_id: recipientId,
      subject,
      send_status: "failed",
      error: errText.slice(0, 500),
    });
    return { sent: false, error: errText };
  }

  await supabase.from("accountability_sends").insert({
    recipient_id: recipientId,
    subject,
    send_status: "sent",
  });

  return { sent: true, recipient: recipient.email };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  try {
    const supabase = createServiceClient();
    const body = await req.json().catch(() => ({}));
    const {
      mode = "cron",
      user_id,
      date,
    } = body as { mode?: string; user_id?: string; date?: string };

    const yesterday = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const targetDate = date ?? yesterday;

    if (mode === "manual") {
      // Manual single-user invocation (auth required)
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer "))
        return errorResponse("missing bearer token", 401);
      const { data: userData } = await supabase.auth.getUser(auth.slice(7));
      const callerId = userData?.user?.id;
      if (!callerId) return errorResponse("invalid token", 401);
      if (user_id && user_id !== callerId)
        return errorResponse("forbidden", 403);

      const { data: recipients } = await supabase
        .from("accountability_recipients")
        .select("id")
        .eq("user_id", callerId)
        .eq("enabled", true);

      const results = [];
      for (const r of recipients ?? []) {
        results.push(await sendDigest(r.id, callerId, targetDate));
      }
      return jsonResponse({ date: targetDate, results });
    }

    // cron mode — fan out across all enabled recipients
    const { data: recipients } = await supabase
      .from("accountability_recipients")
      .select("id, user_id, cadence")
      .eq("enabled", true);

    const isWeekly = new Date().getUTCDay() === 1; // Monday for weekly cadence
    const results = [];
    for (const r of recipients ?? []) {
      if (r.cadence === "weekly" && !isWeekly) continue;
      results.push(await sendDigest(r.id, r.user_id, targetDate));
    }
    return jsonResponse({ date: targetDate, count: results.length, results });
  } catch (err) {
    console.error("accountability-digest error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "unknown error",
      500,
    );
  }
});
