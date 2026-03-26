import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import regression from "regression";
import { mcTokens } from "@/styles/mission-control-tokens";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  MissionTimer,
  EngineeringSummary,
  CommitHeatmap,
  RepoStatusTable,
  RecoveryGauge,
  LocTelemetry,
  PrPipeline,
  VitalsReadout,
  SleepAnalysis,
  TrajectoryBar,
} from "@/components/mission-control";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitRow {
  date: string;
  repo_name: string;
  commit_count: number;
  prs_created: number;
  prs_merged: number;
  lines_added: number;
  lines_deleted: number;
}

interface HealthRow {
  date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  sleep_efficiency: number | null;
  strain: number | null;
  calories: number | null;
}

interface SyncRow {
  github_repos: string[];
  whoop_connected: boolean;
  last_github_sync: string | null;
  last_whoop_sync: string | null;
  github_sync_errors: unknown[];
  whoop_sync_errors: unknown[];
}

interface Prediction {
  text: string;
  targetValue: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POLL_MS = 5 * 60 * 1000; // 5 minutes

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysInMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function trend(
  current: number,
  previous: number,
): { label: string; color: string } {
  if (previous === 0)
    return { label: "--", color: mcTokens.colors.trend.neutral };
  const diff = current - previous;
  const perc = Math.round((diff / previous) * 100);
  const sign = perc >= 0 ? "+" : "";
  return {
    label: `${sign}${perc}%`,
    color:
      perc >= 0
        ? mcTokens.colors.trend.positive
        : mcTokens.colors.trend.negative,
  };
}

function computePrediction(
  dataPoints: { x: number; y: number }[],
  unit: string,
  mode: "cumulative" | "raw" = "raw",
): Prediction | null {
  if (dataPoints.length < 14) return null;
  const recent = dataPoints.slice(-90);

  // For commit-style data, convert to cumulative (monotonically increasing)
  // This produces a meaningful linear fit even when daily counts are noisy
  let regressionInput: [number, number][];
  if (mode === "cumulative") {
    let cumulative = 0;
    regressionInput = recent.map((p) => {
      cumulative += p.y;
      return [p.x, cumulative] as [number, number];
    });
  } else {
    regressionInput = recent.map((p) => [p.x, p.y]);
  }

  const result = regression.linear(regressionInput);
  if (result.r2 === null || result.r2 < 0.1) return null;
  const slope = result.equation[0]; // daily rate (for cumulative: commits per day)
  if (slope === 0) return null;

  if (mode === "cumulative") {
    // Slope = average daily rate. Project forward.
    const dailyRate = slope;
    const daysRemaining =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).getDate() - new Date().getDate();
    const projectedMonthEnd = Math.round(
      regressionInput[regressionInput.length - 1][1] +
        dailyRate * daysRemaining,
    );
    const avgPerDay = Math.round(dailyRate * 10) / 10;
    return {
      text: `Averaging ${avgPerDay} ${unit}/day. On pace for ~${projectedMonthEnd.toLocaleString()} total ${unit} by end of month.`,
      targetValue: projectedMonthEnd,
    };
  }

  // Raw mode (for health metrics like recovery %)
  const lastX = recent[recent.length - 1].x;
  const projected = slope * (lastX + 30) + result.equation[1];
  return {
    text: `At this rate, ${Math.round(projected)} ${unit} by end of next month.`,
    targetValue: Math.round(projected),
  };
}

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

function useMissionControlData() {
  const { user } = useAuth();
  const [commits, setCommits] = useState<CommitRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [sync, setSync] = useState<SyncRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const since = daysAgo(90);

    const [commitRes, healthRes, syncRes] = await Promise.all([
      supabase
        .from("mission_control_commits")
        .select(
          "date, repo_name, commit_count, prs_created, prs_merged, lines_added, lines_deleted",
        )
        .eq("user_id", user.id)
        .gte("date", since)
        .order("date", { ascending: true }),
      supabase
        .from("mission_control_health")
        .select(
          "date, recovery_score, hrv_ms, resting_hr, sleep_hours, sleep_efficiency, strain, calories",
        )
        .eq("user_id", user.id)
        .gte("date", since)
        .order("date", { ascending: true }),
      supabase
        .from("mission_control_sync")
        .select(
          "github_repos, whoop_connected, last_github_sync, last_whoop_sync, github_sync_errors, whoop_sync_errors",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (commitRes.data) setCommits(commitRes.data as CommitRow[]);
    if (healthRes.data) setHealth(healthRes.data as HealthRow[]);
    if (syncRes.data) setSync(syncRes.data as SyncRow);
    setLoading(false);
    setLastFetch(new Date());
  }, [user]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { commits, health, sync, loading, lastFetch };
}

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

function useEngMetrics(commits: CommitRow[]) {
  return useMemo(() => {
    const todayStr = today();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    // Aggregate by date
    const byDate = new Map<
      string,
      { commits: number; prs_created: number; prs_merged: number }
    >();
    for (const c of commits) {
      const prev = byDate.get(c.date) ?? {
        commits: 0,
        prs_created: 0,
        prs_merged: 0,
      };
      byDate.set(c.date, {
        commits: prev.commits + c.commit_count,
        prs_created: prev.prs_created + c.prs_created,
        prs_merged: prev.prs_merged + c.prs_merged,
      });
    }

    const todayCommits = byDate.get(todayStr)?.commits ?? 0;
    const repos = new Set(
      commits.filter((c) => c.date === todayStr).map((c) => c.repo_name),
    ).size;

    let weekCommits = 0;
    let monthCommits = 0;
    let totalPRsCreated = 0;
    let totalPRsMerged = 0;
    let shipDays = 0;
    let monthLinesAdded = 0;
    let monthLinesDeleted = 0;
    const totalDaysThisMonth = daysInMonth();

    for (const [date, agg] of byDate) {
      if (date >= weekStart) weekCommits += agg.commits;
      if (date >= monthStart) {
        monthCommits += agg.commits;
        totalPRsCreated += agg.prs_created;
        totalPRsMerged += agg.prs_merged;
        if (agg.commits > 0) shipDays++;
      }
    }

    // Aggregate LoC across all repos for the month
    for (const c of commits) {
      if (c.date >= monthStart) {
        monthLinesAdded += c.lines_added;
        monthLinesDeleted += c.lines_deleted;
      }
    }

    // Previous week for trend
    const prevWeekStart = daysAgo(14);
    let prevWeekCommits = 0;
    for (const [date, agg] of byDate) {
      if (date >= prevWeekStart && date < weekStart)
        prevWeekCommits += agg.commits;
    }

    const weekTrend = trend(weekCommits, prevWeekCommits);

    // Sparkline data + labels: last 30 days
    const spark: number[] = [];
    const sparkLabels: string[] = [];
    const shortMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      spark.push(byDate.get(d)?.commits ?? 0);
      const dt = new Date(d + "T12:00:00");
      sparkLabels.push(`${shortMonths[dt.getMonth()]} ${dt.getDate()}`);
    }

    // Prediction
    const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
    const predData = sorted.map(([, agg], i) => ({ x: i, y: agg.commits }));
    const prediction = computePrediction(predData, "commits", "cumulative");

    return {
      todayCommits,
      repos,
      weekCommits,
      weekTrend,
      monthCommits,
      totalPRsCreated,
      totalPRsMerged,
      shipDays,
      totalDaysThisMonth,
      monthLinesAdded,
      monthLinesDeleted,
      spark,
      sparkLabels,
      prediction,
    };
  }, [commits]);
}

function useHealthMetrics(health: HealthRow[]) {
  return useMemo(() => {
    if (health.length === 0) return null;

    const latest = health[health.length - 1];

    // Averages for trend (last 7 vs prior 7)
    const last7 = health.slice(-7);
    const prior7 = health.slice(-14, -7);

    function avg(rows: HealthRow[], key: keyof HealthRow): number {
      const vals = rows.map((r) => r[key]).filter((v) => v != null) as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    const hrvTrend = avg(last7, "hrv_ms") - avg(prior7, "hrv_ms");
    const hrTrend = avg(last7, "resting_hr") - avg(prior7, "resting_hr");

    // Sparkline: last 30 days of recovery + labels
    const spark: number[] = [];
    const sparkLabels: string[] = [];
    const shortMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const healthMap = new Map(health.map((h) => [h.date, h]));
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      spark.push(healthMap.get(d)?.recovery_score ?? 0);
      const dt = new Date(d + "T12:00:00");
      sparkLabels.push(`${shortMonths[dt.getMonth()]} ${dt.getDate()}`);
    }

    // Sleep sparkline: last 30 days of sleep hours + labels
    const sleepSpark: number[] = [];
    const sleepLabels: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      sleepSpark.push(healthMap.get(d)?.sleep_hours ?? 0);
      const dt = new Date(d + "T12:00:00");
      sleepLabels.push(`${shortMonths[dt.getMonth()]} ${dt.getDate()}`);
    }

    // HRV and RHR sparklines: last 30 days
    const hrvSpark: number[] = [];
    const rhrSpark: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      hrvSpark.push(healthMap.get(d)?.hrv_ms ?? 0);
      rhrSpark.push(healthMap.get(d)?.resting_hr ?? 0);
    }

    // 30-day rolling averages (only count non-null values)
    const last30 = health.slice(-30);
    function avg30(rows: HealthRow[], key: keyof HealthRow): number | null {
      const vals = rows.map((r) => r[key]).filter((v) => v != null) as number[];
      return vals.length > 0
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;
    }
    const hrvAvg = avg30(last30, "hrv_ms");
    const rhrAvg = avg30(last30, "resting_hr");
    const strainAvg = avg30(last30, "strain");
    const calAvg = avg30(last30, "calories");
    const recoveryAvg = avg30(last30, "recovery_score");

    // Prediction on recovery
    const sorted = [...health].sort((a, b) => a.date.localeCompare(b.date));
    const predData = sorted
      .filter((h) => h.recovery_score != null)
      .map((h, i) => ({ x: i, y: h.recovery_score as number }));
    const prediction = computePrediction(predData, "% recovery");

    return {
      recovery: latest.recovery_score,
      hrv: latest.hrv_ms,
      restingHR: latest.resting_hr,
      sleepHours: latest.sleep_hours,
      sleepEfficiency: latest.sleep_efficiency,
      strain: latest.strain,
      calories: latest.calories,
      hrvTrend: {
        label: `${hrvTrend >= 0 ? "+" : ""}${Math.round(hrvTrend)}ms`,
        color:
          hrvTrend >= 0
            ? mcTokens.colors.trend.positive
            : mcTokens.colors.trend.negative,
      },
      hrTrend: {
        label: `${hrTrend >= 0 ? "+" : ""}${Math.round(hrTrend)}`,
        color:
          hrTrend <= 0
            ? mcTokens.colors.trend.positive
            : mcTokens.colors.trend.negative,
      },
      spark,
      sparkLabels,
      sleepSpark,
      sleepLabels,
      hrvSpark,
      rhrSpark,
      hrvAvg,
      rhrAvg,
      strainAvg,
      calAvg,
      recoveryAvg,
      prediction,
    };
  }, [health]);
}

// ---------------------------------------------------------------------------
// Stagger animation variant
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- framer-motion v12 Variants type doesn't support function variants
const fadeVariant: any = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * mcTokens.animation.staggerDelay,
      duration: mcTokens.animation.fadeIn.duration,
      ease: [...mcTokens.animation.fadeIn.ease],
    },
  }),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MissionControl: React.FC = () => {
  const { user } = useAuth();
  const { commits, health, sync, loading } = useMissionControlData();
  const eng = useEngMetrics(commits);
  const healthM = useHealthMetrics(health);

  // Sync status
  const lastSync = [sync?.last_github_sync, sync?.last_whoop_sync]
    .filter(Boolean)
    .sort()
    .pop() as string | null;

  const syncErrors =
    (sync?.github_sync_errors?.length ?? 0) >= 3 ||
    (sync?.whoop_sync_errors?.length ?? 0) >= 3;

  const lastCommitDate =
    commits.length > 0
      ? commits.reduce(
          (latest, c) => (c.date > latest ? c.date : latest),
          commits[0].date,
        )
      : null;

  const whoopConnected = sync?.whoop_connected ?? false;
  const repoCount = sync?.github_repos?.length ?? 0;

  const githubConnected = repoCount > 0;
  const isEmpty = !githubConnected && !whoopConnected;

  if (!user) return null;

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        className="mc-root"
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          background: mcTokens.colors.bg.primary,
          color: mcTokens.colors.accent.teal,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: mcTokens.typography.label.size,
          fontWeight: mcTokens.typography.label.weight,
          letterSpacing: mcTokens.typography.label.letterSpacing,
          textTransform: mcTokens.typography.label.textTransform,
        }}
      >
        <style>{`.mc-root ::selection { background: #1a3a6e; color: #c8d6e5; }`}</style>
        LOADING TELEMETRY...
      </div>
    );
  }

  // ---- Empty state ----
  if (isEmpty) {
    return (
      <div
        className="mc-root"
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          background: mcTokens.colors.bg.primary,
          color: mcTokens.colors.text.secondary,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: mcTokens.typography.label.size,
          fontWeight: mcTokens.typography.label.weight,
          letterSpacing: mcTokens.typography.label.letterSpacing,
          textTransform: mcTokens.typography.label.textTransform,
        }}
      >
        <style>{`.mc-root ::selection { background: #1a3a6e; color: #c8d6e5; }`}</style>
        CONNECT GITHUB AND WHOOP IN SETTINGS
      </div>
    );
  }

  return (
    <div
      className="mc-root"
      style={{
        fontFamily: mcTokens.typography.fontFamily,
        background: mcTokens.colors.bg.primary,
        color: mcTokens.colors.text.primary,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`.mc-root ::selection { background: #1a3a6e; color: #c8d6e5; }`}</style>

      {/* Row 0: Mission Timer (full width) */}
      <MissionTimer
        lastSync={lastSync}
        syncErrors={syncErrors}
        lastCommitDate={lastCommitDate}
      />

      {/* Main Grid: 4 columns, 2 rows */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{
          flex: 1,
          gap: mcTokens.spacing.gap,
          padding: mcTokens.spacing.page,
          alignItems: "stretch",
        }}
      >
        {/* Row 1 */}
        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={0}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <EngineeringSummary
            monthCommits={eng.monthCommits}
            weekCommits={eng.weekCommits}
            weekTrend={eng.weekTrend}
            totalPRsCreated={eng.totalPRsCreated}
            totalPRsMerged={eng.totalPRsMerged}
            shipDays={eng.shipDays}
            totalDaysThisMonth={eng.totalDaysThisMonth}
            monthLinesAdded={eng.monthLinesAdded}
            monthLinesDeleted={eng.monthLinesDeleted}
          />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={1}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <CommitHeatmap commits={commits} />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={2}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <RepoStatusTable commits={commits} repoCount={repoCount} />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={3}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <RecoveryGauge
            recovery={healthM?.recovery ?? null}
            hrv={healthM?.hrv ?? null}
            strain={healthM?.strain ?? null}
            sleepHours={healthM?.sleepHours ?? null}
            whoopConnected={whoopConnected}
            recoveryAvg={healthM?.recoveryAvg ?? null}
          />
        </motion.div>

        {/* Row 2 */}
        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={4}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <LocTelemetry commits={commits} />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={5}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <PrPipeline
            totalPRsCreated={eng.totalPRsCreated}
            totalPRsMerged={eng.totalPRsMerged}
          />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={6}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <VitalsReadout
            hrv={healthM?.hrv ?? null}
            restingHR={healthM?.restingHR ?? null}
            strain={healthM?.strain ?? null}
            calories={healthM?.calories ?? null}
            hrvTrend={
              healthM?.hrvTrend ?? {
                label: "--",
                color: mcTokens.colors.text.secondary,
              }
            }
            hrTrend={
              healthM?.hrTrend ?? {
                label: "--",
                color: mcTokens.colors.text.secondary,
              }
            }
            hrvSpark={healthM?.hrvSpark ?? []}
            rhrSpark={healthM?.rhrSpark ?? []}
            hrvAvg={healthM?.hrvAvg ?? null}
            rhrAvg={healthM?.rhrAvg ?? null}
            strainAvg={healthM?.strainAvg ?? null}
            calAvg={healthM?.calAvg ?? null}
          />
        </motion.div>

        <motion.div
          style={{ ...mcTokens.panel, height: "100%" }}
          custom={7}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <SleepAnalysis
            sleepHours={healthM?.sleepHours ?? null}
            sleepEfficiency={healthM?.sleepEfficiency ?? null}
            sleepSpark={healthM?.sleepSpark ?? []}
            sleepLabels={healthM?.sleepLabels ?? []}
          />
        </motion.div>
      </div>

      {/* Row 3: Trajectory (full width) */}
      <TrajectoryBar
        engPrediction={eng.prediction}
        healthPrediction={healthM?.prediction ?? null}
      />
    </div>
  );
};

export default MissionControl;
