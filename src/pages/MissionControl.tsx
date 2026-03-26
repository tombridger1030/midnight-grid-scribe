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
// Sparkline (interactive SVG with hover crosshair + tooltip)
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  labels,
  unit,
}: {
  data: number[];
  labels?: string[];
  unit?: string;
}) {
  const points = data.slice(-30);
  const pointLabels = labels ? labels.slice(-30) : undefined;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relativeX * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIndex(clamped);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverX = hoverIndex !== null ? hoverIndex * step : 0;
  const hoverY =
    hoverIndex !== null
      ? h - ((points[hoverIndex] - min) / range) * (h - 4) - 2
      : 0;
  const hoverValue = hoverIndex !== null ? points[hoverIndex] : 0;
  const hoverLabel =
    hoverIndex !== null && pointLabels ? pointLabels[hoverIndex] : null;

  // Tooltip positioning: flip to left side if near right edge
  const tooltipFlip = hoverIndex !== null && hoverIndex > points.length * 0.75;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 60,
          display: "block",
          cursor: "crosshair",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        {hoverIndex !== null && (
          <>
            {/* Crosshair vertical line */}
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={h}
              stroke="#333"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            {/* Dot marker */}
            <circle
              cx={hoverX}
              cy={hoverY}
              r={3}
              fill={mcTokens.colors.text.primary}
              stroke="#080808"
              strokeWidth={1}
            />
          </>
        )}
      </svg>
      {/* Tooltip rendered outside SVG for proper text rendering */}
      {hoverIndex !== null && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: tooltipFlip
              ? `calc(${(hoverX / w) * 100}% - 120px)`
              : `calc(${(hoverX / w) * 100}% + 8px)`,
            background: "#141414",
            border: "1px solid #151515",
            padding: "4px 8px",
            fontSize: "10px",
            fontFamily: mcTokens.typography.fontFamily,
            color: "#e8e8e8",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {hoverLabel ? `${hoverLabel}: ` : ""}
          {hoverValue}
          {unit ? ` ${unit}` : ""}
        </div>
      )}
    </div>
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
  borderTop: `2px solid #1a1a1a`,
  padding: mcTokens.spacing.section,
};

const MissionControl: React.FC = () => {
  const { user } = useAuth();
  const { commits, health, sync, loading } = useMissionControlData();
  const eng = useEngMetrics(commits);
  const healthM = useHealthMetrics(health);

  // Ticking clock
  const [clockStr, setClockStr] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setClockStr(`${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

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
  const hasErrors =
    (sync?.github_sync_errors?.length ?? 0) >= 3 ||
    (sync?.whoop_sync_errors?.length ?? 0) >= 3;
  const isStale = syncAge > 60 * 60 * 1000; // > 1 hour
  const isFresh = !hasErrors && (!isStale || !lastSync);
  const syncLabel = hasErrors
    ? "SYNC ERROR"
    : isStale && lastSync
      ? `STALE -- LAST DATA ${minutesAgo(lastSync)}`
      : `SYNCED ${minutesAgo(lastSync)}`;
  const syncColor = hasErrors
    ? mcTokens.colors.status.error
    : isStale && lastSync
      ? mcTokens.colors.status.stale
      : mcTokens.colors.text.muted;

  if (!user) return null;

  // ---- Shared font base ----
  const fontBase: React.CSSProperties = {
    fontFamily: mcTokens.typography.fontFamily,
    color: mcTokens.colors.text.primary,
  };

  // Scoped selection override + pulsing green dot animation
  const selectionStyle = (
    <style>{`
      .mc-root ::selection { background: #333; color: #e8e8e8; }
      @keyframes mc-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `}</style>
  );

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        className="mc-root"
        style={{
          ...fontBase,
          background: mcTokens.colors.bg.primary,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selectionStyle}
        <Label>LOADING TELEMETRY...</Label>
      </div>
    );
  }

  // ---- Empty state ----
  if (isEmpty) {
    return (
      <div
        className="mc-root"
        style={{
          ...fontBase,
          background: mcTokens.colors.bg.primary,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selectionStyle}
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
      className="mc-root"
      style={{
        ...fontBase,
        background: mcTokens.colors.bg.primary,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {selectionStyle}

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
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: mcTokens.typography.tiny.size,
            letterSpacing: mcTokens.typography.tiny.letterSpacing,
            textTransform: mcTokens.typography.tiny.textTransform,
            color: syncColor,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: isFresh ? "#4a4" : syncColor,
              animation: !isFresh ? "mc-pulse 2s ease-in-out infinite" : "none",
              flexShrink: 0,
            }}
          />
          {syncLabel}
        </span>
        <Label>{clockStr}</Label>
      </header>

      {/* ---- Main Grid ---- */}
      <main
        className="grid grid-cols-1 md:grid-cols-2"
        style={{
          flex: 1,
          gap: 0,
          padding: mcTokens.spacing.page,
          paddingTop: mcTokens.spacing.section,
        }}
      >
        {/* =========== ENGINEERING OUTPUT =========== */}
        <motion.section
          style={{
            ...panelStyle,
            borderRight: `1px solid #1a1a1a`,
          }}
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
                    fontSize:
                      eng.todayCommits === 0
                        ? "80px"
                        : mcTokens.typography.hero.size,
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
                <Sparkline
                  data={eng.spark}
                  labels={eng.sparkLabels}
                  unit="commits"
                />
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
              <MetricRow
                label="LINES ADDED"
                value={eng.monthLinesAdded.toLocaleString()}
                trendColor="#4a4"
              />
              <MetricRow
                label="LINES DELETED"
                value={eng.monthLinesDeleted.toLocaleString()}
                trendColor="#a44"
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
                <Sparkline
                  data={healthM.spark}
                  labels={healthM.sparkLabels}
                  unit="% recovery"
                />
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                minHeight: 200,
                marginTop: mcTokens.spacing.section,
              }}
            >
              <div
                style={{
                  border: `1px dashed ${mcTokens.colors.text.muted}`,
                  padding: "20px 32px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: mcTokens.typography.body.size,
                    color: mcTokens.colors.text.secondary,
                    margin: 0,
                  }}
                >
                  Connect Whoop in Settings
                </p>
              </div>
            </div>
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
          borderTop: `1px solid #151515`,
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
