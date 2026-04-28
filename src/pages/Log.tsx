import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  type DailyInputs,
  computeSleepSigma7d,
  getInputsRange,
} from "@/lib/inputsService";
import { type DailyFlow, getFlowRange } from "@/lib/dailyFlowService";
import {
  type OperatorSettings,
  getOperatorSettings,
} from "@/lib/operatorSettingsService";
import { offsetLocalDate as offsetDateStr } from "@/lib/dateUtils";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

interface LogRow {
  date: string;
  inputs?: DailyInputs;
  flow?: DailyFlow;
}

function rowToCsv(row: LogRow, sigma7: number | null): string {
  return [
    row.date,
    row.inputs?.sleep_hours ?? "",
    sigma7?.toFixed(0) ?? "",
    row.inputs?.exercise === true
      ? "Y"
      : row.inputs?.exercise === false
        ? "N"
        : "",
    row.inputs?.diet === true ? "Y" : row.inputs?.diet === false ? "N" : "",
    row.flow?.flow_score ?? "",
    `"${(row.flow?.verdict ?? "").replace(/"/g, "''")}"`,
  ].join(",");
}

function downloadCsv(
  rows: LogRow[],
  allInputs: DailyInputs[],
  targetBed: string,
  targetWake: string,
) {
  const header =
    "date,sleep_hours,sleep_off_target_min,exercise,diet,flow_score,verdict";
  const body = rows
    .map((r) =>
      rowToCsv(
        r,
        computeSleepSigma7d(allInputs, r.date, targetBed, targetWake),
      ),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `noctisium-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Log: React.FC = () => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [allInputs, setAllInputs] = useState<DailyInputs[]>([]);
  const [settings, setSettings] = useState<OperatorSettings | null>(null);

  useEffect(() => {
    // Fetch days+6 worth of inputs so the rolling 7-day off-target avg for the
    // oldest displayed row has its full window available.
    const fetchStart = offsetDateStr(days - 1 + 6);
    const start = offsetDateStr(days - 1);
    const end = offsetDateStr(0);
    Promise.all([
      getInputsRange(fetchStart, end).catch(() => [] as DailyInputs[]),
      getFlowRange(start, end).catch(() => [] as DailyFlow[]),
      getOperatorSettings().catch(() => null),
    ]).then(([inputs, flow, s]) => {
      setAllInputs(inputs);
      setSettings(s);
      const map = new Map<string, LogRow>();
      for (let n = 0; n < days; n++) {
        const date = offsetDateStr(n);
        map.set(date, { date });
      }
      for (const i of inputs) {
        const r = map.get(i.date);
        if (r) r.inputs = i;
      }
      for (const f of flow) {
        const r = map.get(f.date);
        if (r) r.flow = f;
      }
      setRows(
        Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date)),
      );
    });
  }, [days]);

  const targetBed = settings?.target_bedtime?.slice(0, 5) ?? "23:00";
  const targetWake = settings?.target_wake_time?.slice(0, 5) ?? "07:00";

  const stats = useMemo(() => {
    const withFlow = rows.filter(
      (r) => r.flow?.flow_score !== null && r.flow?.flow_score !== undefined,
    );
    const avg = withFlow.length
      ? Math.round(
          withFlow.reduce((a, r) => a + (r.flow!.flow_score as number), 0) /
            withFlow.length,
        )
      : null;
    const sleepRows = rows.filter(
      (r) =>
        r.inputs?.sleep_hours !== null && r.inputs?.sleep_hours !== undefined,
    );
    const sleepAvg = sleepRows.length
      ? (
          sleepRows.reduce((a, r) => a + (r.inputs!.sleep_hours as number), 0) /
          sleepRows.length
        ).toFixed(1)
      : "—";
    const exYes = rows.filter((r) => r.inputs?.exercise === true).length;
    const dietYes = rows.filter((r) => r.inputs?.diet === true).length;
    return { avg, sleepAvg, exYes, dietYes, total: rows.length };
  }, [rows]);

  return (
    <div className="min-h-screen bg-black text-white font-mono px-6 py-6 text-sm">
      <div className="max-w-5xl mx-auto">
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-2 mb-6`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM</span> · LOG
            </span>
            <Link to="/" className={`text-xs ${ACCENT.muted} hover:underline`}>
              ◀ TERMINAL
            </Link>
          </div>
        </div>

        {/* SUMMARY */}
        <section className="mb-6">
          <div className={`text-xs ${ACCENT.cyan} mb-2`}>
            SUMMARY · LAST {days} DAYS
          </div>
          <div className="flex gap-8 text-xs pl-4">
            <span>
              <span className={ACCENT.muted}>FLOW AVG </span>
              <span className="text-white text-base">{stats.avg ?? "—"}</span>
            </span>
            <span>
              <span className={ACCENT.muted}>SLEEP AVG </span>
              <span className="text-white text-base">{stats.sleepAvg}</span>
              <span className={ACCENT.muted}>H</span>
            </span>
            <span>
              <span className={ACCENT.muted}>EX </span>
              <span className="text-white text-base">{stats.exYes}</span>
              <span className={ACCENT.muted}>/{stats.total}</span>
            </span>
            <span>
              <span className={ACCENT.muted}>DIET </span>
              <span className="text-white text-base">{stats.dietYes}</span>
              <span className={ACCENT.muted}>/{stats.total}</span>
            </span>
          </div>
        </section>

        {/* CONTROLS */}
        <section className="mb-3 flex items-center gap-4 text-xs">
          <span className={ACCENT.muted}>RANGE</span>
          {[7, 30, 90, 365].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={
                n === days ? ACCENT.amber : `${ACCENT.muted} hover:text-white`
              }
            >
              {n}d
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => downloadCsv(rows, allInputs, targetBed, targetWake)}
            className={`${ACCENT.cyan} hover:underline`}
          >
            ▼ EXPORT CSV
          </button>
        </section>

        {/* TABLE */}
        <table className="w-full text-xs">
          <thead>
            <tr className={`${ACCENT.muted} border-b ${ACCENT.rule}`}>
              <th className="text-left font-normal py-1">DATE</th>
              <th className="text-right font-normal">SLP</th>
              <th className="text-right font-normal">OFF</th>
              <th className="text-center font-normal">EX</th>
              <th className="text-center font-normal">DT</th>
              <th className="text-right font-normal">FLOW</th>
              <th className="text-left font-normal pl-4">VERDICT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.date}
                className={idx === 0 ? ACCENT.amber : "text-white"}
              >
                <td className="py-0.5">{r.date}</td>
                <td className="text-right">{r.inputs?.sleep_hours ?? "—"}</td>
                <td className="text-right">
                  {computeSleepSigma7d(
                    allInputs,
                    r.date,
                    targetBed,
                    targetWake,
                  )?.toFixed(0) ?? "—"}
                </td>
                <td
                  className={`text-center ${r.inputs?.exercise === false ? ACCENT.red : ""}`}
                >
                  {r.inputs?.exercise === true
                    ? "Y"
                    : r.inputs?.exercise === false
                      ? "N"
                      : "·"}
                </td>
                <td
                  className={`text-center ${r.inputs?.diet === false ? ACCENT.red : ""}`}
                >
                  {r.inputs?.diet === true
                    ? "Y"
                    : r.inputs?.diet === false
                      ? "N"
                      : "·"}
                </td>
                <td className="text-right">{r.flow?.flow_score ?? "·"}</td>
                <td className={`pl-4 ${ACCENT.muted}`}>
                  {r.flow?.verdict ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Log;
