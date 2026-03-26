import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import regression from "regression";
import { mcTokens } from "@/styles/mission-control-tokens";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitRow {
  date: string;
  repo_name: string;
  commit_count: number;
  prs_created: number;
  prs_merged: number;
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

function minutesAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
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

function pct(a: number, b: number): string {
  if (b === 0) return "--";
  return `${Math.round((a / b) * 100)}%`;
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
): Prediction | null {
  if (dataPoints.length < 14) return null;
  const recent = dataPoints.slice(-90);
  const data: [number, number][] = recent.map((p) => [p.x, p.y]);
  const result = regression.linear(data);
  if (result.r2 === null || result.r2 < 0.3) return null;
  const slope = result.equation[0];
  if (slope === 0) return null;
  const lastX = recent[recent.length - 1].x;
  const projected = slope * (lastX + 30) + result.equation[1];
  return {
    text: `At this rate, ${Math.round(projected)} ${unit} by end of next month.`,
    targetValue: Math.round(projected),
  };
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sparkline (pure SVG)
// ---------------------------------------------------------------------------

function Sparkline({ data }: { data: number[] }) {
  const points = data.slice(-30);
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 400;
  const h = 60;
  const step = w / (points.length - 1);

  const polyline = points
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 60, display: "block" }}
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          y1={h * f}
          x2={w}
          y2={h * f}
          stroke={mcTokens.colors.border.subtle}
          strokeWidth={0.5}
        />
      ))}
      <polyline
        points={polyline}
        fill="none"
        stroke={mcTokens.colors.text.primary}
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const fadeVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * mcTokens.animation.staggerDelay,
      duration: mcTokens.animation.fadeIn.duration,
      ease: mcTokens.animation.fadeIn.ease,
    },
  }),
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: mcTokens.typography.label.size,
        fontWeight: mcTokens.typography.label.weight,
        letterSpacing: mcTokens.typography.label.letterSpacing,
        textTransform: mcTokens.typography.label.textTransform,
        color: mcTokens.colors.text.secondary,
      }}
    >
      {children}
    </span>
  );
}

function MetricRow({
  label,
  value,
  suffix,
  trendLabel,
  trendColor,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  trendLabel?: string;
  trendColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: `${mcTokens.spacing.inner} 0`,
        borderBottom: `1px solid ${mcTokens.colors.border.default}`,
      }}
    >
      <Label>{label}</Label>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: mcTokens.typography.metric.size,
            fontWeight: mcTokens.typography.metric.weight,
            color: mcTokens.colors.text.primary,
          }}
        >
          {value}
          {suffix && (
            <span
              style={{
                fontSize: mcTokens.typography.body.size,
                color: mcTokens.colors.text.secondary,
                marginLeft: 4,
              }}
            >
              {suffix}
            </span>
          )}
        </span>
        {trendLabel && (
          <span
            style={{
              fontSize: mcTokens.typography.body.size,
              color: trendColor ?? mcTokens.colors.trend.neutral,
            }}
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
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
        .select("date, repo_name, commit_count, prs_created, prs_merged")
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
          "github_repos, whoop_connected, last_github_sync, last_whoop_sync",
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

    // Previous week for trend
    const prevWeekStart = daysAgo(14);
    let prevWeekCommits = 0;
    for (const [date, agg] of byDate) {
      if (date >= prevWeekStart && date < weekStart)
        prevWeekCommits += agg.commits;
    }

    const weekTrend = trend(weekCommits, prevWeekCommits);

    // Sparkline data: last 30 days
    const spark: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      spark.push(byDate.get(d)?.commits ?? 0);
    }

    // Prediction
    const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
    const predData = sorted.map(([, agg], i) => ({ x: i, y: agg.commits }));
    const prediction = computePrediction(predData, "commits");

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
      spark,
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

    // Sparkline: last 30 days of recovery
    const spark: number[] = [];
    const healthMap = new Map(health.map((h) => [h.date, h]));
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      spark.push(healthMap.get(d)?.recovery_score ?? 0);
    }

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
      prediction,
    };
  }, [health]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  background: mcTokens.colors.bg.panel,
  border: `1px solid ${mcTokens.colors.border.default}`,
  padding: mcTokens.spacing.section,
};

const MissionControl: React.FC = () => {
  const { user } = useAuth();
  const { commits, health, sync, loading, lastFetch } = useMissionControlData();
  const eng = useEngMetrics(commits);
  const healthM = useHealthMetrics(health);

  const githubConnected = sync !== null && (sync.github_repos?.length ?? 0) > 0;
  const whoopConnected = sync?.whoop_connected ?? false;
  const isEmpty = !githubConnected && !whoopConnected;

  // Determine sync status
  const lastSync = [sync?.last_github_sync, sync?.last_whoop_sync]
    .filter(Boolean)
    .sort()
    .pop();
  const syncAge = lastSync
    ? Date.now() - new Date(lastSync).getTime()
    : Infinity;
  const isStale = syncAge > 30 * 60 * 1000; // > 30 min
  const syncLabel =
    isStale && lastSync ? "SYNC ERROR" : `SYNCED ${minutesAgo(lastSync)}`;
  const syncColor =
    isStale && lastSync
      ? mcTokens.colors.status.error
      : mcTokens.colors.text.muted;

  if (!user) return null;

  // ---- Shared font base ----
  const fontBase: React.CSSProperties = {
    fontFamily: mcTokens.typography.fontFamily,
    color: mcTokens.colors.text.primary,
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        style={{
          ...fontBase,
          background: mcTokens.colors.bg.primary,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Label>LOADING TELEMETRY...</Label>
      </div>
    );
  }

  // ---- Empty state ----
  if (isEmpty) {
    return (
      <div
        style={{
          ...fontBase,
          background: mcTokens.colors.bg.primary,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            fontSize: mcTokens.typography.body.size,
            color: mcTokens.colors.text.secondary,
          }}
        >
          Connect GitHub and Whoop in Settings to begin.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...fontBase,
        background: mcTokens.colors.bg.primary,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ---- Status Bar ---- */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `${mcTokens.spacing.inner} ${mcTokens.spacing.page}`,
          borderBottom: `1px solid ${mcTokens.colors.border.default}`,
        }}
      >
        <Label>NOCTISIUM</Label>
        <span
          style={{
            fontSize: mcTokens.typography.tiny.size,
            letterSpacing: mcTokens.typography.tiny.letterSpacing,
            textTransform: mcTokens.typography.tiny.textTransform,
            color: syncColor,
          }}
        >
          {syncLabel}
        </span>
        <Label>{formatDate()}</Label>
      </header>

      {/* ---- Main Grid ---- */}
      <main
        className="grid grid-cols-1 md:grid-cols-2"
        style={{
          flex: 1,
          gap: 1,
          padding: mcTokens.spacing.page,
          paddingTop: mcTokens.spacing.section,
        }}
      >
        {/* =========== ENGINEERING OUTPUT =========== */}
        <motion.section
          style={panelStyle}
          custom={0}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <Label>ENGINEERING OUTPUT</Label>

          {githubConnected ? (
            <>
              {/* Hero */}
              <div style={{ marginTop: mcTokens.spacing.section }}>
                <span
                  style={{
                    fontSize: mcTokens.typography.hero.size,
                    fontWeight: mcTokens.typography.hero.weight,
                    lineHeight: mcTokens.typography.hero.lineHeight,
                    color: mcTokens.colors.text.primary,
                    display: "block",
                  }}
                >
                  {eng.todayCommits}
                </span>
                <span
                  style={{
                    fontSize: mcTokens.typography.body.size,
                    color: mcTokens.colors.text.secondary,
                  }}
                >
                  commits today
                  {eng.repos > 0 &&
                    ` across ${eng.repos} repositor${eng.repos === 1 ? "y" : "ies"}`}
                </span>
              </div>

              {/* Sparkline */}
              <div style={{ margin: `${mcTokens.spacing.section} 0` }}>
                <Sparkline data={eng.spark} />
              </div>

              {/* Metric rows */}
              <MetricRow
                label="THIS WEEK"
                value={eng.weekCommits}
                trendLabel={eng.weekTrend.label}
                trendColor={eng.weekTrend.color}
              />
              <MetricRow label="THIS MONTH" value={eng.monthCommits} />
              <MetricRow label="PRS CREATED" value={eng.totalPRsCreated} />
              <MetricRow
                label="PRS MERGED"
                value={eng.totalPRsMerged}
                trendLabel={
                  eng.totalPRsCreated > 0
                    ? pct(eng.totalPRsMerged, eng.totalPRsCreated)
                    : undefined
                }
                trendColor={mcTokens.colors.text.secondary}
              />
              <MetricRow
                label="SHIP DAYS"
                value={`${eng.shipDays}/${eng.totalDaysThisMonth}`}
                trendLabel={pct(eng.shipDays, eng.totalDaysThisMonth)}
                trendColor={mcTokens.colors.text.secondary}
              />

              {/* Prediction */}
              <div style={{ marginTop: mcTokens.spacing.section }}>
                <Label>TRAJECTORY</Label>
                <p
                  style={{
                    fontSize: mcTokens.typography.body.size,
                    color: mcTokens.colors.text.secondary,
                    marginTop: 8,
                  }}
                >
                  {eng.prediction ? eng.prediction.text : "Collecting data..."}
                </p>
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: mcTokens.typography.body.size,
                color: mcTokens.colors.text.secondary,
                marginTop: mcTokens.spacing.section,
              }}
            >
              Connect GitHub in Settings to begin.
            </p>
          )}
        </motion.section>

        {/* =========== HEALTH TELEMETRY =========== */}
        <motion.section
          style={panelStyle}
          custom={1}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
        >
          <Label>HEALTH TELEMETRY</Label>

          {whoopConnected && healthM ? (
            <>
              {/* Hero */}
              <div style={{ marginTop: mcTokens.spacing.section }}>
                <span
                  style={{
                    fontSize: mcTokens.typography.hero.size,
                    fontWeight: mcTokens.typography.hero.weight,
                    lineHeight: mcTokens.typography.hero.lineHeight,
                    color: mcTokens.colors.text.primary,
                    display: "block",
                  }}
                >
                  {healthM.recovery != null
                    ? `${Math.round(healthM.recovery)}%`
                    : "--"}
                </span>
                <span
                  style={{
                    fontSize: mcTokens.typography.body.size,
                    color: mcTokens.colors.text.secondary,
                  }}
                >
                  Whoop &middot; synced{" "}
                  {minutesAgo(sync?.last_whoop_sync ?? null)}
                </span>
              </div>

              {/* Sparkline */}
              <div style={{ margin: `${mcTokens.spacing.section} 0` }}>
                <Sparkline data={healthM.spark} />
              </div>

              {/* Metric rows */}
              <MetricRow
                label="HRV"
                value={healthM.hrv != null ? Math.round(healthM.hrv) : "--"}
                suffix="ms"
                trendLabel={healthM.hrvTrend.label}
                trendColor={healthM.hrvTrend.color}
              />
              <MetricRow
                label="RESTING HR"
                value={
                  healthM.restingHR != null
                    ? Math.round(healthM.restingHR)
                    : "--"
                }
                suffix="bpm"
                trendLabel={healthM.hrTrend.label}
                trendColor={healthM.hrTrend.color}
              />
              <MetricRow
                label="SLEEP"
                value={
                  healthM.sleepHours != null
                    ? healthM.sleepHours.toFixed(1)
                    : "--"
                }
                suffix="h"
                trendLabel={
                  healthM.sleepEfficiency != null
                    ? `${Math.round(healthM.sleepEfficiency)}%`
                    : undefined
                }
                trendColor={mcTokens.colors.text.secondary}
              />
              <MetricRow
                label="STRAIN"
                value={
                  healthM.strain != null ? healthM.strain.toFixed(1) : "--"
                }
              />
              <MetricRow
                label="CALORIES"
                value={
                  healthM.calories != null
                    ? healthM.calories.toLocaleString("en-US")
                    : "--"
                }
              />

              {/* Prediction */}
              <div style={{ marginTop: mcTokens.spacing.section }}>
                <Label>TRAJECTORY</Label>
                <p
                  style={{
                    fontSize: mcTokens.typography.body.size,
                    color: mcTokens.colors.text.secondary,
                    marginTop: 8,
                  }}
                >
                  {healthM.prediction
                    ? healthM.prediction.text
                    : "Collecting data..."}
                </p>
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: mcTokens.typography.body.size,
                color: mcTokens.colors.text.secondary,
                marginTop: mcTokens.spacing.section,
              }}
            >
              Connect Whoop in Settings to begin.
            </p>
          )}
        </motion.section>
      </main>

      {/* ---- Footer ---- */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `${mcTokens.spacing.inner} ${mcTokens.spacing.page}`,
          borderTop: `1px solid ${mcTokens.colors.border.default}`,
        }}
      >
        <span
          style={{
            fontSize: mcTokens.typography.tiny.size,
            letterSpacing: mcTokens.typography.tiny.letterSpacing,
            textTransform: mcTokens.typography.tiny.textTransform,
            color: mcTokens.colors.text.muted,
          }}
        >
          GitHub API &middot; Whoop API
        </span>
        <span
          style={{
            fontSize: mcTokens.typography.tiny.size,
            letterSpacing: mcTokens.typography.tiny.letterSpacing,
            textTransform: mcTokens.typography.tiny.textTransform,
            color: mcTokens.colors.text.muted,
          }}
        >
          90-day rolling linear regression
        </span>
      </footer>
    </div>
  );
};

export default MissionControl;
