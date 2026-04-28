import { useEffect, useState } from "react";
import {
  type AnalyticsBundle,
  type BlockTrendRow,
  type DowCell,
  type FlowPoint,
  type LatencyRow,
  type Range,
  getAnalytics,
} from "@/lib/analyticsService";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  green: "text-[#00C853]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

// Hex-string equivalents for SVG fill/stroke (Tailwind class colors above)
const HEX = {
  cyan: "#00D4FF",
  amber: "#FFB800",
  red: "#FF3344",
  green: "#00C853",
  white: "#FFFFFF",
  muted: "#888888",
  dim: "#666666",
  grid: "#1a1a1a",
  axis: "#3a3a3a",
} as const;

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "ALL" },
];

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function scoreColorHex(s: number | null): string {
  if (s === null) return HEX.dim;
  if (s >= 80) return HEX.green;
  if (s >= 60) return HEX.white;
  if (s >= 40) return HEX.amber;
  return HEX.red;
}

function scoreColor(s: number | null): string {
  if (s === null) return ACCENT.dim;
  if (s >= 80) return ACCENT.green;
  if (s >= 60) return "text-white";
  if (s >= 40) return ACCENT.amber;
  return ACCENT.red;
}

function fmtN(n: number | null, digits = 0): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function fmtMinSigned(min: number | null): string {
  if (min === null) return "—";
  const r = Math.round(min);
  return r > 0 ? `+${r}` : `${r}`;
}

function dateMs(date: string): number {
  return Date.parse(date);
}

function shortDate(date: string): string {
  // YYYY-MM-DD → MM-DD
  return date.slice(5);
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG chart primitives — all Bloomberg-flat: monospace text, sharp corners,
// muted gridlines, accent-colored data, no shadows or animations.
// ─────────────────────────────────────────────────────────────────────────────

const FONT = "'JetBrains Mono', monospace";

interface AxesProps {
  width: number;
  height: number;
  margin: { l: number; r: number; t: number; b: number };
  yMin: number;
  yMax: number;
  yTicks: number[];
  xTicks: { v: number; label: string }[];
  yLabel?: string;
}

function Axes({
  width,
  height,
  margin: m,
  yMin,
  yMax,
  yTicks,
  xTicks,
  yLabel,
}: AxesProps) {
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const yScale = (y: number) => m.t + (1 - (y - yMin) / (yMax - yMin)) * ph;
  return (
    <g>
      {/* Horizontal gridlines + Y labels */}
      {yTicks.map((y) => (
        <g key={y}>
          <line
            x1={m.l}
            y1={yScale(y)}
            x2={width - m.r}
            y2={yScale(y)}
            stroke={HEX.grid}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text
            x={m.l - 4}
            y={yScale(y) + 3}
            fill={HEX.muted}
            fontSize={9}
            fontFamily={FONT}
            textAnchor="end"
          >
            {y}
          </text>
        </g>
      ))}
      {/* Y axis */}
      <line
        x1={m.l}
        y1={m.t}
        x2={m.l}
        y2={height - m.b}
        stroke={HEX.axis}
        shapeRendering="crispEdges"
      />
      {/* X axis */}
      <line
        x1={m.l}
        y1={height - m.b}
        x2={width - m.r}
        y2={height - m.b}
        stroke={HEX.axis}
        shapeRendering="crispEdges"
      />
      {/* X tick labels — anchor edges inward so they don't clip the viewBox */}
      {xTicks.map((t, i) => (
        <text
          key={i}
          x={t.v}
          y={height - m.b + 12}
          fill={HEX.muted}
          fontSize={9}
          fontFamily={FONT}
          textAnchor={
            i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
          }
        >
          {t.label}
        </text>
      ))}
      {yLabel && (
        <text
          x={m.l + 4}
          y={m.t + 9}
          fill={HEX.dim}
          fontSize={8}
          fontFamily={FONT}
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

// Line chart: a single line over (date, value) with dots at each point.
function LineSparkline({
  series,
  startDate,
  endDate,
  height = 90,
  width = 220,
  yMin = 0,
  yMax = 100,
  color = HEX.cyan,
  showDots = true,
  refLines = [],
}: {
  series: { date: string; score: number }[];
  startDate: string;
  endDate: string;
  height?: number;
  width?: number;
  yMin?: number;
  yMax?: number;
  color?: string;
  showDots?: boolean;
  refLines?: { y: number; color: string }[];
}) {
  const m = { l: 22, r: 4, t: 6, b: 14 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const xMin = dateMs(startDate);
  const xMax = dateMs(endDate);
  const xRange = Math.max(1, xMax - xMin);
  const xScale = (ms: number) => m.l + ((ms - xMin) / xRange) * pw;
  const yScale = (y: number) => m.t + (1 - (y - yMin) / (yMax - yMin)) * ph;

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xTicks = [
    { v: xScale(xMin), label: shortDate(startDate) },
    { v: xScale(xMax), label: shortDate(endDate) },
  ];

  const path = series
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xScale(dateMs(p.date)).toFixed(1)},${yScale(p.score).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <Axes
        width={width}
        height={height}
        margin={m}
        yMin={yMin}
        yMax={yMax}
        yTicks={yTicks}
        xTicks={xTicks}
      />
      {refLines.map((rl, i) => (
        <line
          key={i}
          x1={m.l}
          y1={yScale(rl.y)}
          x2={width - m.r}
          y2={yScale(rl.y)}
          stroke={rl.color}
          strokeDasharray="2 3"
          strokeWidth={0.7}
        />
      ))}
      {series.length > 1 && (
        <path d={path} stroke={color} strokeWidth={1.2} fill="none" />
      )}
      {showDots &&
        series.map((p, i) => (
          <circle
            key={i}
            cx={xScale(dateMs(p.date))}
            cy={yScale(p.score)}
            r={1.6}
            fill={scoreColorHex(p.score)}
          />
        ))}
    </svg>
  );
}

// Big line chart with Y gridlines every 25 and reference bands at 50 + 75.
function FlowLineChart({
  points,
  startDate,
  endDate,
  height = 220,
}: {
  points: FlowPoint[];
  startDate: string;
  endDate: string;
  height?: number;
}) {
  const width = 900;
  const m = { l: 32, r: 12, t: 12, b: 22 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const xMin = dateMs(startDate);
  const xMax = dateMs(endDate);
  const xRange = Math.max(1, xMax - xMin);
  const xScale = (ms: number) => m.l + ((ms - xMin) / xRange) * pw;
  const yScale = (y: number) => m.t + (1 - y / 100) * ph;

  const filtered = points.filter((p) => p.flow_score !== null);
  const path = filtered
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xScale(dateMs(p.date)).toFixed(1)},${yScale(p.flow_score!).toFixed(1)}`,
    )
    .join(" ");

  const yTicks = [0, 25, 50, 75, 100];
  // 5 X tick labels evenly spaced
  const tickCount = Math.min(6, filtered.length || 2);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const ms = xMin + (i / (tickCount - 1)) * xRange;
    const d = new Date(ms);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { v: xScale(ms), label: shortDate(ds) };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Bands: <50 dim red, 50-75 white, 75+ green */}
      <rect
        x={m.l}
        y={yScale(75)}
        width={pw}
        height={yScale(50) - yScale(75)}
        fill="#0a1a0a"
      />
      <rect
        x={m.l}
        y={yScale(100)}
        width={pw}
        height={yScale(75) - yScale(100)}
        fill="#0d1f0d"
      />
      <Axes
        width={width}
        height={height}
        margin={m}
        yMin={0}
        yMax={100}
        yTicks={yTicks}
        xTicks={xTicks}
        yLabel="FLOW"
      />
      {/* 50 + 75 reference lines */}
      <line
        x1={m.l}
        y1={yScale(50)}
        x2={width - m.r}
        y2={yScale(50)}
        stroke={HEX.amber}
        strokeDasharray="3 3"
        strokeWidth={0.6}
      />
      <line
        x1={m.l}
        y1={yScale(75)}
        x2={width - m.r}
        y2={yScale(75)}
        stroke={HEX.green}
        strokeDasharray="3 3"
        strokeWidth={0.6}
      />
      {filtered.length > 1 && (
        <path
          d={path}
          stroke={HEX.cyan}
          strokeWidth={1.2}
          fill="none"
          strokeLinejoin="round"
        />
      )}
      {filtered.map((p, i) => (
        <circle
          key={i}
          cx={xScale(dateMs(p.date))}
          cy={yScale(p.flow_score!)}
          r={2}
          fill={scoreColorHex(p.flow_score)}
        />
      ))}
    </svg>
  );
}

// Horizontal diverging bar chart for latency.
function LatencyBarChart({
  rows,
  height,
}: {
  rows: LatencyRow[];
  height: number;
}) {
  const width = 720;
  const m = { l: 130, r: 50, t: 8, b: 22 };
  const pw = width - m.l - m.r;
  const rowH = (height - m.t - m.b) / rows.length;
  const barH = Math.min(7, rowH * 0.32);

  // Symmetric x range from -max to +max
  const allMins = rows.flatMap((r) =>
    [r.avg_start_latency, r.avg_end_drift].filter(
      (v): v is number => v !== null,
    ),
  );
  const maxAbs = Math.max(15, ...allMins.map((v) => Math.abs(v)));
  const xScale = (v: number) => m.l + pw / 2 + (v / maxAbs) * (pw / 2);
  const xTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].map((v) => ({
    v: xScale(v),
    label: v === 0 ? "0" : v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`,
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Grid lines */}
      {xTicks.map((t, i) => (
        <line
          key={i}
          x1={t.v}
          y1={m.t}
          x2={t.v}
          y2={height - m.b}
          stroke={i === 2 ? HEX.axis : HEX.grid}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
      {/* Bottom axis + tick labels */}
      <line
        x1={m.l}
        y1={height - m.b}
        x2={width - m.r}
        y2={height - m.b}
        stroke={HEX.axis}
        shapeRendering="crispEdges"
      />
      {xTicks.map((t, i) => (
        <text
          key={i}
          x={t.v}
          y={height - m.b + 12}
          fill={HEX.muted}
          fontSize={9}
          fontFamily={FONT}
          textAnchor="middle"
        >
          {t.label}
        </text>
      ))}
      {rows.map((r, i) => {
        const cy = m.t + i * rowH + rowH / 2;
        const startBar =
          r.avg_start_latency === null
            ? null
            : { x: xScale(0), w: xScale(r.avg_start_latency) - xScale(0) };
        const endBar =
          r.avg_end_drift === null
            ? null
            : { x: xScale(0), w: xScale(r.avg_end_drift) - xScale(0) };
        return (
          <g key={r.label}>
            {/* Label */}
            <text
              x={m.l - 6}
              y={cy + 3}
              fill={HEX.white}
              fontSize={10}
              fontFamily={FONT}
              textAnchor="end"
            >
              {r.label.toUpperCase()}
            </text>
            {/* Start latency bar (cyan) */}
            {startBar && (
              <rect
                x={Math.min(startBar.x, startBar.x + startBar.w)}
                y={cy - barH - 1}
                width={Math.abs(startBar.w)}
                height={barH}
                fill={HEX.cyan}
                shapeRendering="crispEdges"
              />
            )}
            {/* End drift bar (amber) */}
            {endBar && (
              <rect
                x={Math.min(endBar.x, endBar.x + endBar.w)}
                y={cy + 1}
                width={Math.abs(endBar.w)}
                height={barH}
                fill={HEX.amber}
                shapeRendering="crispEdges"
              />
            )}
            {/* Inline numeric labels */}
            <text
              x={width - m.r + 4}
              y={cy + 3}
              fill={HEX.muted}
              fontSize={9}
              fontFamily={FONT}
            >
              n={r.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Vertical bar chart: avg score by day-of-week per block. Small multiples grid.
function DowBarChart({ row }: { row: DowCell }) {
  const width = 220;
  const height = 100;
  const m = { l: 24, r: 4, t: 8, b: 18 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const colW = pw / 7;
  const yScale = (v: number) => m.t + (1 - v / 100) * ph;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <Axes
        width={width}
        height={height}
        margin={m}
        yMin={0}
        yMax={100}
        yTicks={[0, 50, 100]}
        xTicks={[]}
      />
      {row.byDow.map((v, dow) => {
        if (v === null) return null;
        const x = m.l + dow * colW + colW * 0.18;
        const w = colW * 0.64;
        const y = yScale(v);
        const h = height - m.b - y;
        return (
          <g key={dow}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={scoreColorHex(v)}
              shapeRendering="crispEdges"
            />
          </g>
        );
      })}
      {DOW_LABELS.map((d, i) => (
        <text
          key={i}
          x={m.l + i * colW + colW / 2}
          y={height - m.b + 11}
          fill={HEX.muted}
          fontSize={8}
          fontFamily={FONT}
          textAnchor="middle"
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

// Scatter plot: sleep_hours (X) vs flow_score (Y), colored by exercise.
function SleepFlowScatter({ points }: { points: FlowPoint[] }) {
  const width = 600;
  const height = 280;
  const m = { l: 40, r: 12, t: 12, b: 32 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;

  const valid = points.filter(
    (p) => p.sleep_hours !== null && p.flow_score !== null,
  );

  const xMin = 4;
  const xMax = 11;
  const xScale = (x: number) => m.l + ((x - xMin) / (xMax - xMin)) * pw;
  const yScale = (y: number) => m.t + (1 - y / 100) * ph;

  // Linear regression
  const n = valid.length;
  let slope = 0,
    intercept = 0;
  if (n >= 2) {
    const sumX = valid.reduce((a, p) => a + p.sleep_hours!, 0);
    const sumY = valid.reduce((a, p) => a + p.flow_score!, 0);
    const sumXY = valid.reduce((a, p) => a + p.sleep_hours! * p.flow_score!, 0);
    const sumX2 = valid.reduce((a, p) => a + p.sleep_hours! ** 2, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) > 1e-6) {
      slope = (n * sumXY - sumX * sumY) / denom;
      intercept = (sumY - slope * sumX) / n;
    }
  }

  const yTicks = [0, 25, 50, 75, 100];
  const xTicks = [4, 5, 6, 7, 8, 9, 10, 11].map((v) => ({
    v: xScale(v),
    label: `${v}H`,
  }));

  const exColor = (ex: boolean | null) =>
    ex === true ? HEX.green : ex === false ? HEX.red : HEX.muted;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <Axes
        width={width}
        height={height}
        margin={m}
        yMin={0}
        yMax={100}
        yTicks={yTicks}
        xTicks={xTicks}
        yLabel="FLOW"
      />
      {/* Trend line */}
      {n >= 2 && (
        <line
          x1={xScale(xMin)}
          y1={yScale(Math.max(0, Math.min(100, slope * xMin + intercept)))}
          x2={xScale(xMax)}
          y2={yScale(Math.max(0, Math.min(100, slope * xMax + intercept)))}
          stroke={HEX.cyan}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}
      {/* Reference at 75 */}
      <line
        x1={m.l}
        y1={yScale(75)}
        x2={width - m.r}
        y2={yScale(75)}
        stroke={HEX.green}
        strokeDasharray="2 4"
        strokeWidth={0.5}
      />
      {/* Points */}
      {valid.map((p, i) => (
        <circle
          key={i}
          cx={xScale(Math.max(xMin, Math.min(xMax, p.sleep_hours!)))}
          cy={yScale(p.flow_score!)}
          r={2.6}
          fill={exColor(p.exercise)}
          fillOpacity={0.85}
        />
      ))}
      {/* X axis label */}
      <text
        x={(m.l + width - m.r) / 2}
        y={height - 6}
        fill={HEX.muted}
        fontSize={9}
        fontFamily={FONT}
        textAnchor="middle"
      >
        SLEEP (HOURS) — GREEN=EX YES · RED=EX NO · GRAY=UNSET
        {n >= 2 &&
          ` · SLOPE ${slope >= 0 ? "+" : ""}${slope.toFixed(1)} FLOW/H`}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="border border-[#222] p-3 mb-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-xs ${ACCENT.cyan}`}>{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ msg }: { msg: string }) {
  return <div className={`text-xs ${ACCENT.dim} pl-1`}>{msg}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const Analytics: React.FC = () => {
  const [range, setRange] = useState<Range>("30d");
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAnalytics(range)
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono px-4 py-3 text-sm">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-1.5 mb-3`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM</span>{" "}
              <span className={ACCENT.muted}>·</span>{" "}
              <span className="text-white">ANALYTICS</span>
            </span>
            <span className={`${ACCENT.muted} tabular-nums`}>
              {now.toLocaleTimeString("en-US", { hour12: false })} LOCAL
            </span>
          </div>
        </div>

        {/* Range selector + headline numbers */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2 text-xs">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2 py-0.5 border ${
                  range === r.value
                    ? `${ACCENT.amber} border-current`
                    : `${ACCENT.dim} border-[#222] hover:text-white`
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {bundle && (
            <div className={`text-xs ${ACCENT.muted} flex gap-4`}>
              <span>
                JUDGED <span className="text-white">{bundle.total_judged}</span>
              </span>
              <span>
                ROUTINE{" "}
                <span className="text-white">{bundle.total_routine}</span>
              </span>
              <span>
                AVG FLOW{" "}
                <span className={scoreColor(bundle.flowSummary.avg_flow)}>
                  {fmtN(bundle.flowSummary.avg_flow)}
                </span>
              </span>
              <span>
                {bundle.start_date} → {bundle.end_date}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div
            className={`border ${ACCENT.red} border-current p-2 mb-3 text-xs ${ACCENT.red}`}
          >
            ERROR: {error}
          </div>
        )}

        {loading && !bundle ? (
          <div className={`text-xs ${ACCENT.dim} pl-1`}>loading…</div>
        ) : bundle ? (
          <>
            {/* 1. WORK QUALITY — small-multiples line charts */}
            <Panel title="WORK QUALITY · SCORE OVER TIME (PER BLOCK)">
              {bundle.blockTrends.length === 0 ? (
                <EmptyHint msg="no judged blocks captured in this range." />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {bundle.blockTrends.map((row: BlockTrendRow) => (
                    <div
                      key={row.label}
                      className="border border-[#1a1a1a] p-2"
                    >
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[10px] text-white truncate">
                          {row.label.toUpperCase()}
                        </span>
                        <span className="text-[10px] tabular-nums">
                          <span className={ACCENT.muted}>n=</span>
                          <span className="text-white">{row.count}</span>{" "}
                          <span className={ACCENT.muted}>μ</span>
                          <span className={scoreColor(row.avg_score)}>
                            {fmtN(row.avg_score)}
                          </span>
                        </span>
                      </div>
                      <LineSparkline
                        series={row.series}
                        startDate={bundle.start_date}
                        endDate={bundle.end_date}
                        refLines={[{ y: 75, color: HEX.green }]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 2. DAY-OF-WEEK BARS */}
              <Panel title="DAY-OF-WEEK · AVG SCORE PER BLOCK">
                {bundle.dowHeatmap.length === 0 ? (
                  <EmptyHint msg="no judged data yet." />
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {bundle.dowHeatmap.map((row) => (
                      <div
                        key={row.label}
                        className="border border-[#1a1a1a] p-2"
                      >
                        <div className="text-[10px] text-white truncate mb-1">
                          {row.label.toUpperCase()}
                        </div>
                        <DowBarChart row={row} />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* 3. LATENCY BARS */}
              <Panel title="LATENCY · START (CYAN) / END-DRIFT (AMBER) MIN">
                {bundle.latency.length === 0 ? (
                  <EmptyHint msg="no timed blocks captured yet." />
                ) : (
                  <LatencyBarChart
                    rows={bundle.latency}
                    height={Math.max(180, 26 * bundle.latency.length + 30)}
                  />
                )}
              </Panel>
            </div>

            {/* 4. SLEEP → FLOW SCATTER + summary */}
            <Panel title="SLEEP → FLOW · SCATTER">
              {bundle.flowSummary.avg_flow === null ? (
                <EmptyHint msg="no flow scores in this range." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4">
                  <SleepFlowScatter points={bundle.flowSeries} />
                  <table className="text-xs h-fit">
                    <tbody>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>
                          HIGH SLEEP (≥7H)
                        </td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.high_sleep_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.high_sleep_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>
                          LOW SLEEP (&lt;7H)
                        </td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.low_sleep_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.low_sleep_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>EX YES</td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.ex_y_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.ex_y_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>EX NO</td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.ex_n_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.ex_n_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>DIET YES</td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.diet_y_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.diet_y_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>DIET NO</td>
                        <td
                          className={`text-right tabular-nums pl-3 ${scoreColor(bundle.flowSummary.diet_n_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.diet_n_avg_flow)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* 5. DAILY FLOW LINE CHART */}
            <Panel title="DAILY FLOW · TIME SERIES">
              {bundle.flowSeries.filter((p) => p.flow_score !== null).length ===
              0 ? (
                <EmptyHint msg="no flow scores yet." />
              ) : (
                <FlowLineChart
                  points={bundle.flowSeries}
                  startDate={bundle.start_date}
                  endDate={bundle.end_date}
                />
              )}
            </Panel>

            {/* 6. CONSISTENCY (table — streaks aren't chartable) */}
            <Panel title="CONSISTENCY · CURRENT / LONGEST (DAYS)">
              <table className="w-full text-xs max-w-2xl">
                <thead>
                  <tr className={ACCENT.muted}>
                    <th className="text-left font-normal pb-1">METRIC</th>
                    <th className="text-right font-normal pb-1">CURRENT</th>
                    <th className="text-right font-normal pb-1">LONGEST</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      k: "EXERCISE = Y",
                      c: bundle.consistency.ex_current,
                      l: bundle.consistency.ex_longest,
                    },
                    {
                      k: "DIET = Y",
                      c: bundle.consistency.diet_current,
                      l: bundle.consistency.diet_longest,
                    },
                    {
                      k: "FLOW ≥ 75",
                      c: bundle.consistency.flow75_current,
                      l: bundle.consistency.flow75_longest,
                    },
                    {
                      k: "ALL JUDGED CAPTURED",
                      c: bundle.consistency.all_judged_current,
                      l: bundle.consistency.all_judged_longest,
                    },
                  ].map((row) => (
                    <tr key={row.k}>
                      <td className="text-white py-0.5">{row.k}</td>
                      <td
                        className={`text-right tabular-nums ${row.c > 0 ? ACCENT.green : ACCENT.dim}`}
                      >
                        {row.c}
                      </td>
                      <td className="text-right tabular-nums text-white">
                        {row.l}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </>
        ) : null}

        <div
          className={`border-t ${ACCENT.rule} pt-2 text-xs ${ACCENT.dim} text-center`}
        >
          NOCTISIUM · v3
        </div>
      </div>
    </div>
  );
};

export default Analytics;
