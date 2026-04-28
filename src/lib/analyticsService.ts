import { supabase } from "./supabase";
import type { BlockKind } from "./blockService";
import { computeSleepOffsetMin } from "./inputsService";

export type Range = "7d" | "30d" | "90d" | "all";

export interface BlockTrendRow {
  label: string;
  kind: BlockKind;
  count: number;
  avg_score: number | null;
  latest_score: number | null;
  /** Last 14 days of scores, chronological. null = no captured judged instance that day. */
  trend14: (number | null)[];
}

export interface DowCell {
  label: string;
  /** Index 0=Sun..6=Sat. value = avg quality score, null = no instances. */
  byDow: (number | null)[];
}

export interface LatencyRow {
  label: string;
  count: number;
  /** Minutes; positive = started late, negative = early. */
  avg_start_latency: number | null;
  /** Minutes; positive = ended after planned end, negative = before. */
  avg_end_drift: number | null;
  /** Actual block duration in minutes. */
  avg_actual_min: number | null;
  /** Planned duration in minutes. */
  planned_min: number;
}

export interface FlowPoint {
  date: string;
  flow_score: number | null;
  sleep_hours: number | null;
  sleep_offset_min: number | null;
  exercise: boolean | null;
  diet: boolean | null;
}

export interface FlowSummary {
  avg_flow: number | null;
  /** Avg flow on days where sleep_hours >= 7. */
  high_sleep_avg_flow: number | null;
  /** Avg flow on days where sleep_hours < 7. */
  low_sleep_avg_flow: number | null;
  ex_y_avg_flow: number | null;
  ex_n_avg_flow: number | null;
  diet_y_avg_flow: number | null;
  diet_n_avg_flow: number | null;
}

export interface ConsistencyStats {
  ex_current: number;
  ex_longest: number;
  diet_current: number;
  diet_longest: number;
  flow75_current: number;
  flow75_longest: number;
  /** Days where all judged blocks scheduled that day were captured. */
  all_judged_current: number;
  all_judged_longest: number;
}

export interface AnalyticsBundle {
  range: Range;
  start_date: string;
  end_date: string;
  total_judged: number;
  total_routine: number;
  blockTrends: BlockTrendRow[];
  dowHeatmap: DowCell[];
  latency: LatencyRow[];
  flowSeries: FlowPoint[];
  flowSummary: FlowSummary;
  consistency: ConsistencyStats;
}

const todayLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function rangeStartDate(range: Range): string {
  if (range === "all") return "1970-01-01";
  const days = parseInt(range, 10);
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function avg(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function plannedTimestamp(date: string, hhmm: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").slice(0, 2).map(Number);
  return new Date(y, m - 1, d, h, min);
}

function diffMin(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 60000;
}

function dowFromDateStr(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

interface RawInstance {
  id: string;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  quality_score: number | null;
  status: string;
  schedule_blocks: {
    label: string;
    kind: BlockKind;
    start_time: string;
    end_time: string;
  } | null;
}

interface RawInputs {
  date: string;
  sleep_hours: number | null;
  sleep_start_at: string | null;
  sleep_end_at: string | null;
  exercise: boolean | null;
  diet: boolean | null;
}

interface RawFlow {
  date: string;
  flow_score: number | null;
}

interface RawSettings {
  target_bedtime: string | null;
  target_wake_time: string | null;
}

/** Walk dates backward from today, counting consecutive days where predicate holds. */
function currentStreak(
  dates: string[],
  predicate: (date: string) => boolean,
): number {
  let n = 0;
  const today = todayLocalISO();
  // Walk backward day by day
  const d = new Date(today);
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dates.includes(ds)) break;
    if (!predicate(ds)) break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Longest run of consecutive (calendar) days where predicate holds, across the date set. */
function longestStreak(
  dates: string[],
  predicate: (date: string) => boolean,
): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 0;
  let cur = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    if (!predicate(d)) {
      cur = 0;
      prev = null;
      continue;
    }
    const [y, m, day] = d.split("-").map(Number);
    const cd = new Date(y, m - 1, day);
    if (prev && (cd.getTime() - prev.getTime()) / 86_400_000 === 1) {
      cur++;
    } else {
      cur = 1;
    }
    if (cur > best) best = cur;
    prev = cd;
  }
  return best;
}

export async function getAnalytics(range: Range): Promise<AnalyticsBundle> {
  const today = todayLocalISO();
  const start = rangeStartDate(range);

  const [instRes, inputsRes, flowRes, settingsRes] = await Promise.all([
    supabase
      .from("block_instances")
      .select(
        "id, date, started_at, ended_at, quality_score, status, schedule_blocks(label, kind, start_time, end_time)",
      )
      .gte("date", start)
      .lte("date", today),
    supabase
      .from("daily_inputs")
      .select("date, sleep_hours, sleep_start_at, sleep_end_at, exercise, diet")
      .gte("date", start)
      .lte("date", today),
    supabase
      .from("daily_flow")
      .select("date, flow_score")
      .gte("date", start)
      .lte("date", today),
    supabase
      .from("operator_settings")
      .select("target_bedtime, target_wake_time")
      .maybeSingle(),
  ]);

  const instances = (instRes.data ?? []) as unknown as RawInstance[];
  const inputs = (inputsRes.data ?? []) as RawInputs[];
  const flows = (flowRes.data ?? []) as RawFlow[];
  const settings = (settingsRes.data ?? null) as RawSettings | null;
  const targetBed = settings?.target_bedtime?.slice(0, 5) ?? "23:00";
  const targetWake = settings?.target_wake_time?.slice(0, 5) ?? "07:00";

  // Group by label (judged + note + routine separately).
  const byLabel = new Map<string, { kind: BlockKind; rows: RawInstance[] }>();
  for (const r of instances) {
    if (!r.schedule_blocks) continue;
    const key = r.schedule_blocks.label;
    if (!byLabel.has(key))
      byLabel.set(key, { kind: r.schedule_blocks.kind, rows: [] });
    byLabel.get(key)!.rows.push(r);
  }

  // === 1. Block trends (judged + note: anything captured, but score only for judged) ===
  const trend14Dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trend14Dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const blockTrends: BlockTrendRow[] = [];
  for (const [label, { kind, rows }] of byLabel.entries()) {
    if (kind !== "judged") continue; // trends only meaningful for judged blocks
    const captured = rows.filter(
      (r) => r.status === "captured" && r.quality_score !== null,
    );
    const scores = captured.map((r) => r.quality_score!);
    const dateToScore = new Map<string, number>();
    for (const r of captured) dateToScore.set(r.date, r.quality_score!);
    const sortedByDate = [...captured].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    blockTrends.push({
      label,
      kind,
      count: scores.length,
      avg_score: avg(scores),
      latest_score: sortedByDate.length
        ? sortedByDate[sortedByDate.length - 1].quality_score
        : null,
      trend14: trend14Dates.map((d) => dateToScore.get(d) ?? null),
    });
  }
  blockTrends.sort((a, b) => a.label.localeCompare(b.label));

  // === 2. Day-of-week heatmap (judged only) ===
  const dowHeatmap: DowCell[] = [];
  for (const [label, { kind, rows }] of byLabel.entries()) {
    if (kind !== "judged") continue;
    const buckets: number[][] = Array.from({ length: 7 }, () => []);
    for (const r of rows) {
      if (r.quality_score === null) continue;
      buckets[dowFromDateStr(r.date)].push(r.quality_score);
    }
    dowHeatmap.push({
      label,
      byDow: buckets.map((xs) => avg(xs)),
    });
  }
  dowHeatmap.sort((a, b) => a.label.localeCompare(b.label));

  // === 3. Latency stats (judged + note: anything timed) ===
  const latency: LatencyRow[] = [];
  for (const [label, { kind, rows }] of byLabel.entries()) {
    if (kind === "routine") continue; // routine blocks aren't time-tracked
    const sb = rows[0]?.schedule_blocks;
    if (!sb) continue;
    const startLat: number[] = [];
    const endDrift: number[] = [];
    const actualMin: number[] = [];
    for (const r of rows) {
      if (r.status !== "captured") continue;
      if (!r.started_at || !r.ended_at) continue;
      const ps = plannedTimestamp(r.date, sb.start_time);
      const pe = plannedTimestamp(r.date, sb.end_time);
      const as = new Date(r.started_at);
      const ae = new Date(r.ended_at);
      startLat.push(diffMin(as, ps));
      endDrift.push(diffMin(ae, pe));
      actualMin.push(diffMin(ae, as));
    }
    latency.push({
      label,
      count: actualMin.length,
      avg_start_latency: avg(startLat),
      avg_end_drift: avg(endDrift),
      avg_actual_min: avg(actualMin),
      planned_min: diffMin(
        plannedTimestamp("2000-01-01", sb.end_time),
        plannedTimestamp("2000-01-01", sb.start_time),
      ),
    });
  }
  latency.sort((a, b) => a.label.localeCompare(b.label));

  // === 4. Flow series + summary ===
  const inputsByDate = new Map(inputs.map((i) => [i.date, i]));
  const flowByDate = new Map(flows.map((f) => [f.date, f]));
  const allDates = new Set<string>([
    ...inputsByDate.keys(),
    ...flowByDate.keys(),
  ]);
  const flowSeries: FlowPoint[] = [...allDates].sort().map((date) => {
    const i = inputsByDate.get(date);
    const f = flowByDate.get(date);
    return {
      date,
      flow_score: f?.flow_score ?? null,
      sleep_hours: i?.sleep_hours ?? null,
      sleep_offset_min: computeSleepOffsetMin(
        i?.sleep_start_at ?? null,
        i?.sleep_end_at ?? null,
        targetBed,
        targetWake,
      ),
      exercise: i?.exercise ?? null,
      diet: i?.diet ?? null,
    };
  });

  const flowOnly = flowSeries.filter((p) => p.flow_score !== null);
  const flowSummary: FlowSummary = {
    avg_flow: avg(flowOnly.map((p) => p.flow_score!)),
    high_sleep_avg_flow: avg(
      flowOnly
        .filter((p) => p.sleep_hours !== null && p.sleep_hours >= 7)
        .map((p) => p.flow_score!),
    ),
    low_sleep_avg_flow: avg(
      flowOnly
        .filter((p) => p.sleep_hours !== null && p.sleep_hours < 7)
        .map((p) => p.flow_score!),
    ),
    ex_y_avg_flow: avg(
      flowOnly.filter((p) => p.exercise === true).map((p) => p.flow_score!),
    ),
    ex_n_avg_flow: avg(
      flowOnly.filter((p) => p.exercise === false).map((p) => p.flow_score!),
    ),
    diet_y_avg_flow: avg(
      flowOnly.filter((p) => p.diet === true).map((p) => p.flow_score!),
    ),
    diet_n_avg_flow: avg(
      flowOnly.filter((p) => p.diet === false).map((p) => p.flow_score!),
    ),
  };

  // === 5. Consistency streaks ===
  const inputDates = inputs.map((i) => i.date);
  const flowDates = flows.map((f) => f.date);
  const exYes = new Map(inputs.map((i) => [i.date, i.exercise === true]));
  const dietYes = new Map(inputs.map((i) => [i.date, i.diet === true]));
  const flow75 = new Map(flows.map((f) => [f.date, (f.flow_score ?? 0) >= 75]));

  // For "all judged blocks captured": per date, judged scheduled vs judged captured
  const judgedScheduledByDate = new Map<string, number>();
  const judgedCapturedByDate = new Map<string, number>();
  for (const r of instances) {
    if (r.schedule_blocks?.kind !== "judged") continue;
    judgedScheduledByDate.set(
      r.date,
      (judgedScheduledByDate.get(r.date) ?? 0) + 1,
    );
    if (r.status === "captured") {
      judgedCapturedByDate.set(
        r.date,
        (judgedCapturedByDate.get(r.date) ?? 0) + 1,
      );
    }
  }
  const allJudgedDates = [...judgedScheduledByDate.keys()];
  const allJudgedHit = (date: string) => {
    const sched = judgedScheduledByDate.get(date) ?? 0;
    const cap = judgedCapturedByDate.get(date) ?? 0;
    return sched > 0 && sched === cap;
  };

  const consistency: ConsistencyStats = {
    ex_current: currentStreak(inputDates, (d) => exYes.get(d) === true),
    ex_longest: longestStreak(inputDates, (d) => exYes.get(d) === true),
    diet_current: currentStreak(inputDates, (d) => dietYes.get(d) === true),
    diet_longest: longestStreak(inputDates, (d) => dietYes.get(d) === true),
    flow75_current: currentStreak(flowDates, (d) => flow75.get(d) === true),
    flow75_longest: longestStreak(flowDates, (d) => flow75.get(d) === true),
    all_judged_current: currentStreak(allJudgedDates, allJudgedHit),
    all_judged_longest: longestStreak(allJudgedDates, allJudgedHit),
  };

  return {
    range,
    start_date: start,
    end_date: today,
    total_judged: instances.filter(
      (r) => r.schedule_blocks?.kind === "judged" && r.status === "captured",
    ).length,
    total_routine: instances.filter(
      (r) => r.schedule_blocks?.kind === "routine" && r.status === "captured",
    ).length,
    blockTrends,
    dowHeatmap,
    latency,
    flowSeries,
    flowSummary,
    consistency,
  };
}

/** Render values 0..max as a unicode block sparkline. null → space. */
export function sparkline(
  values: (number | null)[],
  min = 0,
  max = 100,
): string {
  const blocks = "▁▂▃▄▅▆▇█";
  return values
    .map((v) => {
      if (v === null) return "·";
      const ratio = (v - min) / (max - min);
      const idx = Math.min(
        blocks.length - 1,
        Math.max(0, Math.round(ratio * (blocks.length - 1))),
      );
      return blocks[idx];
    })
    .join("");
}
