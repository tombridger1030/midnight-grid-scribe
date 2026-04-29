import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  type DailyInputs,
  computeSleepOffsetMin,
  computeSleepSigma7d,
  formatLocalHHMM,
  getInputs,
  getInputsRange,
  setBedTime,
  setDiet,
  setExercise,
  setWakeTime,
} from "@/lib/inputsService";
import {
  type DailyFlow,
  getFlow,
  getFlowRange,
  scoreToday,
} from "@/lib/dailyFlowService";
import { type BlockInstanceWithLabel, listForDate } from "@/lib/blockService";
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

function YNToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const cell = (label: "Y" | "N", active: boolean) => (
    <button
      onClick={() =>
        onChange(active && value === (label === "Y") ? null : label === "Y")
      }
      className={`px-2 ${
        active ? (label === "Y" ? "text-[#00C853]" : ACCENT.red) : ACCENT.dim
      } hover:text-white text-xs`}
    >
      [{active ? label : "·"}]
    </button>
  );
  return (
    <span className="inline-flex">
      {cell("Y", value === true)}
      {cell("N", value === false)}
    </span>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="time"
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        if (e.target.value !== value) onChange(e.target.value);
      }}
      className="bg-transparent text-white border-b border-[#444] focus:border-[#00D4FF] focus:outline-none px-1 text-xs w-24"
    />
  );
}

function DayEditorModal({
  date,
  targetBed,
  targetWake,
  onClose,
  onSaved,
}: {
  date: string;
  targetBed: string;
  targetWake: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [inputs, setInputs] = useState<DailyInputs | null>(null);
  const [flow, setFlow] = useState<DailyFlow | null>(null);
  const [blocks, setBlocks] = useState<BlockInstanceWithLabel[]>([]);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [i, f, b] = await Promise.all([
      getInputs(date).catch(() => null),
      getFlow(date).catch(() => null),
      listForDate(date).catch(() => [] as BlockInstanceWithLabel[]),
    ]);
    setInputs(i);
    setFlow(f);
    setBlocks(b);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const offset = computeSleepOffsetMin(
    inputs?.sleep_start_at ?? null,
    inputs?.sleep_end_at ?? null,
    targetBed,
    targetWake,
  );

  const handleScore = async () => {
    setScoring(true);
    setError(null);
    try {
      const result = await scoreToday(date);
      if (result) {
        setFlow(result);
        onSaved();
      } else {
        setError("score failed — check console");
      }
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-24 z-50 px-4">
      <div className="w-full max-w-xl bg-black border border-[#444] p-6 font-mono text-sm">
        <div className="flex items-center justify-between mb-4">
          <div className={`text-xs ${ACCENT.cyan}`}>DAY DETAIL · {date}</div>
          <button
            onClick={onClose}
            className={`text-xs ${ACCENT.muted} hover:text-white`}
          >
            ✗ CLOSE
          </button>
        </div>

        <div className={`text-xs ${ACCENT.muted} mb-1`}>INPUTS</div>
        <div className="border border-[#222] p-3 mb-4 space-y-2">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span>
              <span className={ACCENT.muted}>BED </span>
              <TimeInput
                value={formatLocalHHMM(inputs?.sleep_start_at ?? null)}
                onChange={async (bed) => {
                  await setBedTime(date, bed || null);
                  await refresh();
                  onSaved();
                }}
              />
            </span>
            <span>
              <span className={ACCENT.muted}>WAKE </span>
              <TimeInput
                value={formatLocalHHMM(inputs?.sleep_end_at ?? null)}
                onChange={async (wake) => {
                  await setWakeTime(date, wake || null);
                  await refresh();
                  onSaved();
                }}
              />
            </span>
            <span>
              <span className={ACCENT.muted}>SLP </span>
              <span className="text-white">
                {inputs?.sleep_hours?.toFixed(1) ?? "—"}
              </span>
              <span className={ACCENT.muted}>H</span>
            </span>
            <span>
              <span className={ACCENT.muted}>OFF </span>
              <span className="text-white">{offset?.toFixed(0) ?? "—"}</span>
              <span className={ACCENT.muted}>m</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>
              <span className={ACCENT.muted}>EX </span>
              <YNToggle
                value={inputs?.exercise ?? null}
                onChange={async (v) => {
                  await setExercise(date, v);
                  await refresh();
                  onSaved();
                }}
              />
            </span>
            <span>
              <span className={ACCENT.muted}>DIET </span>
              <YNToggle
                value={inputs?.diet ?? null}
                onChange={async (v) => {
                  await setDiet(date, v);
                  await refresh();
                  onSaved();
                }}
              />
            </span>
          </div>
        </div>

        <div className={`text-xs ${ACCENT.muted} mb-1`}>DAILY FLOW</div>
        <div className="border border-[#222] p-3 mb-4">
          {flow?.flow_score != null ? (
            <div>
              <div className="text-white text-3xl tabular-nums leading-none">
                {flow.flow_score}
              </div>
              <div className={`mt-1 text-xs ${ACCENT.muted}`}>
                {flow.verdict}
              </div>
            </div>
          ) : (
            <div className={`text-xs ${ACCENT.dim}`}>no score yet</div>
          )}
          <button
            onClick={handleScore}
            disabled={scoring}
            className={`mt-3 text-xs ${ACCENT.amber} hover:underline disabled:opacity-30`}
          >
            [ {scoring ? "scoring..." : flow ? "rescore" : "score this day"} ]
          </button>
          {error && <div className={`text-xs ${ACCENT.red} mt-2`}>{error}</div>}
        </div>

        <div className={`text-xs ${ACCENT.muted} mb-1`}>JOURNAL</div>
        <div className="border border-[#222] p-3 mb-4 max-h-72 overflow-y-auto">
          {(() => {
            const entries = blocks.filter((b) => (b.results_text ?? "").trim());
            if (entries.length === 0) {
              return (
                <div className={`text-xs ${ACCENT.dim}`}>
                  no clock-out notes for this day
                </div>
              );
            }
            return (
              <div className="space-y-3 text-xs">
                {entries.map((b) => {
                  const t = b.started_at
                    ? `${String(new Date(b.started_at).getHours()).padStart(2, "0")}:${String(new Date(b.started_at).getMinutes()).padStart(2, "0")}`
                    : "--:--";
                  return (
                    <div key={b.id}>
                      <div className={ACCENT.muted}>
                        <span className="text-white tabular-nums">{t}</span>
                        {" · "}
                        <span className={ACCENT.cyan}>
                          {b.label.toUpperCase()}
                        </span>
                        {b.kind === "judged" && b.quality_score !== null && (
                          <span className="text-white">
                            {" · "}
                            {b.quality_score}
                          </span>
                        )}
                      </div>
                      <div className="text-white whitespace-pre-wrap mt-0.5">
                        {b.results_text}
                      </div>
                      {b.kind === "judged" && b.quality_verdict && (
                        <div className={`${ACCENT.dim} mt-0.5`}>
                          ↳ {b.quality_verdict}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className={`text-xs ${ACCENT.dim}`}>
          edits save immediately · close when done
        </div>
      </div>
    </div>
  );
}

const Log: React.FC = () => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [allInputs, setAllInputs] = useState<DailyInputs[]>([]);
  const [settings, setSettings] = useState<OperatorSettings | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [days, reloadKey]);

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
                onClick={() => setEditDate(r.date)}
                className={`cursor-pointer hover:bg-[#111] ${idx === 0 ? ACCENT.amber : "text-white"}`}
              >
                <td className="py-0.5 underline-offset-2 hover:underline">
                  {r.date}
                </td>
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
      {editDate && (
        <DayEditorModal
          date={editDate}
          targetBed={targetBed}
          targetWake={targetWake}
          onClose={() => setEditDate(null)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default Log;
