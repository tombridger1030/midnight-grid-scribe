import { useEffect, useState } from "react";
import {
  type AnalyticsBundle,
  type Range,
  getAnalytics,
  sparkline,
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

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "ALL" },
];

const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function scoreColor(s: number | null): string {
  if (s === null) return ACCENT.dim;
  if (s >= 80) return ACCENT.green;
  if (s >= 60) return "text-white";
  if (s >= 40) return ACCENT.amber;
  return ACCENT.red;
}

function latencyColor(min: number | null): string {
  if (min === null) return ACCENT.dim;
  const a = Math.abs(min);
  if (a <= 5) return ACCENT.green;
  if (a <= 15) return "text-white";
  if (a <= 30) return ACCENT.amber;
  return ACCENT.red;
}

function fmtMinSigned(min: number | null): string {
  if (min === null) return "—";
  const r = Math.round(min);
  return r > 0 ? `+${r}` : `${r}`;
}

function fmtN(n: number | null, digits = 0): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

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
            {/* 1. WORK QUALITY */}
            <Panel title="WORK QUALITY · TREND">
              {bundle.blockTrends.length === 0 ? (
                <EmptyHint msg="no judged blocks captured in this range." />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className={ACCENT.muted}>
                      <th className="text-left font-normal pb-1">LABEL</th>
                      <th className="text-right font-normal pb-1">N</th>
                      <th className="text-right font-normal pb-1">AVG</th>
                      <th className="text-right font-normal pb-1">LATEST</th>
                      <th className="text-left font-normal pb-1 pl-4">
                        TREND-14
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.blockTrends.map((row) => (
                      <tr key={row.label}>
                        <td className="text-white py-0.5">
                          {row.label.toUpperCase()}
                        </td>
                        <td className="text-right tabular-nums">{row.count}</td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(row.avg_score)}`}
                        >
                          {fmtN(row.avg_score)}
                        </td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(row.latest_score)}`}
                        >
                          {row.latest_score ?? "—"}
                        </td>
                        <td className="pl-4 tabular-nums tracking-wide">
                          <span className="text-[#00D4FF]">
                            {sparkline(row.trend14)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 2. DAY-OF-WEEK MATRIX */}
              <Panel title="DAY-OF-WEEK MATRIX · AVG SCORE">
                {bundle.dowHeatmap.length === 0 ? (
                  <EmptyHint msg="no judged data yet." />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={ACCENT.muted}>
                        <th className="text-left font-normal pb-1">LABEL</th>
                        {DOW_LABELS.map((d) => (
                          <th
                            key={d}
                            className="text-center font-normal pb-1 px-1"
                          >
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.dowHeatmap.map((row) => (
                        <tr key={row.label}>
                          <td className="text-white py-0.5 truncate max-w-[10rem]">
                            {row.label.toUpperCase()}
                          </td>
                          {row.byDow.map((v, i) => (
                            <td
                              key={i}
                              className={`text-center tabular-nums px-1 ${scoreColor(v)}`}
                            >
                              {v === null ? "·" : Math.round(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* 3. LATENCY / DRIFT */}
              <Panel title="LATENCY · START-LATE / END-DRIFT (MIN)">
                {bundle.latency.length === 0 ? (
                  <EmptyHint msg="no timed blocks captured yet." />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={ACCENT.muted}>
                        <th className="text-left font-normal pb-1">LABEL</th>
                        <th className="text-right font-normal pb-1">N</th>
                        <th className="text-right font-normal pb-1">START</th>
                        <th className="text-right font-normal pb-1">END</th>
                        <th className="text-right font-normal pb-1">ACTUAL</th>
                        <th className="text-right font-normal pb-1">PLAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.latency.map((row) => (
                        <tr key={row.label}>
                          <td className="text-white py-0.5">
                            {row.label.toUpperCase()}
                          </td>
                          <td className="text-right tabular-nums">
                            {row.count}
                          </td>
                          <td
                            className={`text-right tabular-nums ${latencyColor(row.avg_start_latency)}`}
                          >
                            {fmtMinSigned(row.avg_start_latency)}
                          </td>
                          <td
                            className={`text-right tabular-nums ${latencyColor(row.avg_end_drift)}`}
                          >
                            {fmtMinSigned(row.avg_end_drift)}
                          </td>
                          <td className="text-right tabular-nums">
                            {row.avg_actual_min === null
                              ? "—"
                              : Math.round(row.avg_actual_min)}
                          </td>
                          <td
                            className={`text-right tabular-nums ${ACCENT.muted}`}
                          >
                            {Math.round(row.planned_min)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* 4. SLEEP → FLOW */}
              <Panel title="SLEEP / EX / DIET → FLOW">
                {bundle.flowSummary.avg_flow === null ? (
                  <EmptyHint msg="no flow scores in this range." />
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>
                          HIGH SLEEP (≥7H)
                        </td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.high_sleep_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.high_sleep_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>
                          LOW SLEEP (&lt;7H)
                        </td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.low_sleep_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.low_sleep_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>EX YES</td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.ex_y_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.ex_y_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>EX NO</td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.ex_n_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.ex_n_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>DIET YES</td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.diet_y_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.diet_y_avg_flow)}
                        </td>
                      </tr>
                      <tr>
                        <td className={`${ACCENT.muted} py-0.5`}>DIET NO</td>
                        <td
                          className={`text-right tabular-nums ${scoreColor(bundle.flowSummary.diet_n_avg_flow)}`}
                        >
                          {fmtN(bundle.flowSummary.diet_n_avg_flow)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </Panel>

              {/* 5. CONSISTENCY STREAKS */}
              <Panel title="CONSISTENCY · CURRENT / LONGEST (DAYS)">
                <table className="w-full text-xs">
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
            </div>

            {/* DAILY FLOW STRIP */}
            <Panel title="DAILY FLOW · SERIES">
              {bundle.flowSeries.length === 0 ? (
                <EmptyHint msg="no daily data yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={ACCENT.muted}>
                        <th className="text-left font-normal pb-1">DATE</th>
                        <th className="text-right font-normal pb-1">SLP</th>
                        <th className="text-right font-normal pb-1">OFF</th>
                        <th className="text-center font-normal pb-1">EX</th>
                        <th className="text-center font-normal pb-1">DT</th>
                        <th className="text-right font-normal pb-1">FLOW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.flowSeries
                        .slice(-30)
                        .reverse()
                        .map((p) => (
                          <tr key={p.date}>
                            <td className="text-white py-0.5">
                              {p.date.slice(5)}
                            </td>
                            <td className="text-right tabular-nums">
                              {p.sleep_hours?.toFixed(1) ?? "—"}
                            </td>
                            <td
                              className={`text-right tabular-nums ${latencyColor(p.sleep_offset_min)}`}
                            >
                              {p.sleep_offset_min === null
                                ? "—"
                                : Math.round(p.sleep_offset_min)}
                            </td>
                            <td
                              className={`text-center ${p.exercise === false ? ACCENT.red : p.exercise === true ? ACCENT.green : ACCENT.dim}`}
                            >
                              {p.exercise === true
                                ? "Y"
                                : p.exercise === false
                                  ? "N"
                                  : "·"}
                            </td>
                            <td
                              className={`text-center ${p.diet === false ? ACCENT.red : p.diet === true ? ACCENT.green : ACCENT.dim}`}
                            >
                              {p.diet === true
                                ? "Y"
                                : p.diet === false
                                  ? "N"
                                  : "·"}
                            </td>
                            <td
                              className={`text-right tabular-nums ${scoreColor(p.flow_score)}`}
                            >
                              {p.flow_score ?? "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
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
