import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  type BlockInstanceWithLabel,
  captureResults,
  findActive,
  findEndedPending,
  listForDate,
} from "@/lib/blockService";
import {
  type DailyInputs,
  getInputs,
  getInputsRange,
  setDiet,
  setExercise,
  setSleepHours,
} from "@/lib/inputsService";
import {
  type DailyFlow,
  getFlow,
  getFlowRange,
  scoreToday,
} from "@/lib/dailyFlowService";
import {
  type MonthlyGoal,
  daysRemainingInMonth,
  listGoalsForMonth,
  monthLabel,
} from "@/lib/goalsService";

const todayStr = () => new Date().toISOString().slice(0, 10);
const offsetDateStr = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const fmtClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fmtDateLong = (d: Date) =>
  d
    .toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
const trimSec = (t: string | null) => (t ? t.slice(0, 5) : "—");

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  green: "text-[#00C853]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

function StatusBadge({
  status,
  results_summary,
}: {
  status: string;
  results_summary: string | null;
}) {
  const map: Record<string, string> = {
    pending: "PENDING",
    captured: "CAPTURED",
    missed: "MISSED",
    adhoc: "ADHOC",
  };
  const color =
    status === "captured"
      ? ACCENT.green
      : status === "missed"
        ? ACCENT.red
        : status === "adhoc"
          ? ACCENT.amber
          : ACCENT.muted;
  return (
    <span className={`${color} text-xs`}>
      {map[status] ?? status.toUpperCase()}
      {status === "captured" && results_summary && (
        <span className="text-white"> · "{results_summary}"</span>
      )}
    </span>
  );
}

function CaptureModal({
  block,
  onClose,
  onSaved,
}: {
  block: BlockInstanceWithLabel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await captureResults(block.id, text);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-24 z-50 px-4">
      <div className="w-full max-w-xl bg-black border border-[#444] p-6 font-mono">
        <div className={`text-xs ${ACCENT.cyan} mb-1`}>CAPTURE RESULTS</div>
        <div className="text-sm text-white mb-4">
          {block.label.toUpperCase()} · {trimSec(block.start_time)}–
          {trimSec(block.end_time)}
        </div>
        <div className={`text-xs ${ACCENT.muted} mb-2`}>
          WHAT DID YOU ACCOMPLISH? (RESULTS, NOT ACTIVITY)
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={4}
          autoFocus
          placeholder="shipped X · debugged Y · drafted Z"
          className="w-full bg-black border border-[#444] text-white p-3 text-sm focus:border-[#00D4FF] focus:outline-none resize-none"
        />
        <div className={`text-xs ${ACCENT.dim} text-right mt-1`}>
          {text.length}/280
        </div>
        {error && <div className={`text-xs ${ACCENT.red} mt-2`}>{error}</div>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className={`flex-1 border ${ACCENT.cyan} border-current py-2 text-xs hover:bg-[#00D4FF]/10 disabled:opacity-30`}
          >
            {busy ? "..." : "▶ CAPTURE"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className={`px-4 border ${ACCENT.muted} border-current py-2 text-xs hover:bg-white/5 disabled:opacity-30`}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
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
        active ? (label === "Y" ? ACCENT.green : ACCENT.red) : ACCENT.dim
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

function SleepInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [v, setV] = useState(value !== null ? String(value) : "");
  useEffect(() => setV(value !== null ? String(value) : ""), [value]);

  const commit = () => {
    const trimmed = v.trim();
    if (!trimmed) return onChange(null);
    const n = parseFloat(trimmed);
    if (Number.isNaN(n)) return;
    onChange(Math.round(n * 10) / 10);
  };

  return (
    <input
      type="text"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) =>
        e.key === "Enter" && (e.target as HTMLInputElement).blur()
      }
      placeholder="—"
      className="w-12 bg-transparent text-white text-center border-b border-[#444] focus:border-[#00D4FF] focus:outline-none"
    />
  );
}

const Terminal: React.FC = () => {
  const { profile } = useAuth();
  const today = todayStr();
  const [now, setNow] = useState(new Date());

  const [blocks, setBlocks] = useState<BlockInstanceWithLabel[]>([]);
  const [inputs, setInputs] = useState<DailyInputs | null>(null);
  const [flow, setFlow] = useState<DailyFlow | null>(null);
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [last7Inputs, setLast7Inputs] = useState<DailyInputs[]>([]);
  const [last7Flow, setLast7Flow] = useState<DailyFlow[]>([]);
  const [captureBlock, setCaptureBlock] =
    useState<BlockInstanceWithLabel | null>(null);
  const [scoring, setScoring] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const start = offsetDateStr(6);
    let b: BlockInstanceWithLabel[] = [],
      i: DailyInputs | null = null,
      f: DailyFlow | null = null,
      g: MonthlyGoal[] = [],
      range7Inputs: DailyInputs[] = [],
      range7Flow: DailyFlow[] = [];
    try {
      [b, i, f, g, range7Inputs, range7Flow] = await Promise.all([
        listForDate(today).catch(() => []),
        getInputs(today).catch(() => null),
        getFlow(today).catch(() => null),
        listGoalsForMonth().catch(() => []),
        getInputsRange(start, today).catch(() => []),
        getFlowRange(start, today).catch(() => []),
      ]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
    setBlocks(b);
    setInputs(i);
    setFlow(f);
    setGoals(g);
    setLast7Inputs(range7Inputs);
    setLast7Flow(range7Flow);
  }, [today]);

  useEffect(() => {
    loadAll();
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [loadAll]);

  const active = findActive(blocks);
  const endedPending = findEndedPending(blocks);
  const captured = blocks.filter(
    (b) => b.status === "captured" || b.status === "adhoc",
  ).length;
  const dayLabel = profile?.display_name?.toUpperCase() ?? "OPERATOR";

  const triggerScore = async () => {
    setScoring(true);
    try {
      const result = await scoreToday(today);
      if (result) setFlow(result);
    } finally {
      setScoring(false);
    }
  };

  const last7DateMap = new Map<
    string,
    { inputs?: DailyInputs; flow?: DailyFlow }
  >();
  for (const i of last7Inputs)
    last7DateMap.set(i.date, { ...last7DateMap.get(i.date), inputs: i });
  for (const f of last7Flow)
    last7DateMap.set(f.date, { ...last7DateMap.get(f.date), flow: f });
  const last7Rows = Array.from({ length: 7 }, (_, k) => offsetDateStr(k)).map(
    (date) => ({ date, ...(last7DateMap.get(date) ?? {}) }),
  );

  return (
    <div className="min-h-screen bg-black text-white font-mono px-6 py-6 text-sm">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-2 mb-6`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM TERMINAL</span> ·{" "}
              <span className="text-white">{dayLabel}</span> ·{" "}
              <span className={ACCENT.muted}>{fmtDateLong(now)}</span>
            </span>
            <span className={ACCENT.muted}>{fmtClock(now)} LOCAL</span>
          </div>
        </div>

        {/* End-of-block banner */}
        {endedPending && !captureBlock && (
          <div
            className={`border ${ACCENT.cyan} border-current p-3 mb-6 flex items-center justify-between`}
          >
            <span className="text-xs">
              <span className={ACCENT.cyan}>▶</span> END{" "}
              {endedPending.label.toUpperCase()} · CAPTURE RESULTS
            </span>
            <button
              onClick={() => setCaptureBlock(endedPending)}
              className={`px-3 py-1 text-xs ${ACCENT.cyan} hover:bg-[#00D4FF]/10`}
            >
              [ CAPTURE ]
            </button>
          </div>
        )}

        {/* INPUTS */}
        <section className="mb-6">
          <div className={`text-xs ${ACCENT.cyan} mb-2`}>INPUTS · TODAY</div>
          <div className="flex gap-8 text-sm pl-4">
            <span>
              <span className={ACCENT.muted}>SLEEP </span>
              <SleepInput
                value={inputs?.sleep_hours ?? null}
                onChange={async (v) => {
                  await setSleepHours(today, v);
                  setInputs(await getInputs(today));
                }}
              />
              <span className={ACCENT.muted}>H</span>
            </span>
            <span>
              <span className={ACCENT.muted}>σ7 </span>
              <span className="text-white">
                {inputs?.sleep_sigma_7d?.toFixed(2) ?? "—"}
              </span>
              <span className={ACCENT.muted}>H</span>
            </span>
            <span>
              <span className={ACCENT.muted}>EX </span>
              <YNToggle
                value={inputs?.exercise ?? null}
                onChange={async (v) => {
                  await setExercise(today, v);
                  setInputs(await getInputs(today));
                }}
              />
            </span>
            <span>
              <span className={ACCENT.muted}>DIET </span>
              <YNToggle
                value={inputs?.diet ?? null}
                onChange={async (v) => {
                  await setDiet(today, v);
                  setInputs(await getInputs(today));
                }}
              />
            </span>
          </div>
        </section>

        {/* SCHEDULE */}
        <section className="mb-6">
          <div className={`text-xs ${ACCENT.cyan} mb-2`}>SCHEDULE</div>
          {blocks.length === 0 ? (
            <div className={`pl-4 text-xs ${ACCENT.dim}`}>
              no blocks defined ·{" "}
              <Link to="/settings" className={`underline ${ACCENT.amber}`}>
                configure schedule
              </Link>
            </div>
          ) : (
            <div className="space-y-1 pl-4">
              {blocks.map((b) => {
                const isActive = active?.id === b.id;
                const isEndedPending = endedPending?.id === b.id;
                const accent = isActive
                  ? ACCENT.amber
                  : isEndedPending
                    ? ACCENT.cyan
                    : "";
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-6 text-xs ${accent}`}
                  >
                    <span className={accent || ACCENT.muted}>
                      {trimSec(b.start_time)}–{trimSec(b.end_time)}
                    </span>
                    <span
                      className={`flex-shrink-0 w-32 ${accent || "text-white"}`}
                    >
                      {b.label.toUpperCase()}
                    </span>
                    <span className="flex-1">
                      {isActive ? (
                        <span className={ACCENT.amber}>▶ ACTIVE</span>
                      ) : (
                        <StatusBadge
                          status={b.status}
                          results_summary={b.results_summary}
                        />
                      )}
                    </span>
                    {b.status === "pending" && (isEndedPending || isActive) && (
                      <button
                        onClick={() => setCaptureBlock(b)}
                        className={`text-xs ${ACCENT.cyan} hover:underline`}
                      >
                        [ CAPTURE ]
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RESULTS COUNT */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between text-xs">
            <span className={ACCENT.cyan}>RESULTS LOGGED</span>
            <span className="text-white">
              {captured}/{blocks.length}
            </span>
          </div>
        </section>

        {/* DAILY FLOW */}
        <section className="mb-6">
          <div
            className={`text-xs ${ACCENT.cyan} mb-2 flex items-baseline justify-between`}
          >
            <span>DAILY FLOW</span>
            <button
              onClick={triggerScore}
              disabled={scoring}
              className={`text-xs ${ACCENT.amber} hover:underline disabled:opacity-30`}
            >
              [ {scoring ? "scoring..." : "score now"} ]
            </button>
          </div>
          <div className="pl-4 text-xs">
            {flow ? (
              <div>
                <span className="text-white text-2xl mr-3">
                  {flow.flow_score}
                </span>
                <span className={ACCENT.muted}>{flow.verdict}</span>
              </div>
            ) : (
              <div className={ACCENT.dim}>—</div>
            )}
          </div>
        </section>

        {/* MONTH GOALS */}
        <section className="mb-8">
          <div
            className={`text-xs ${ACCENT.cyan} mb-2 flex items-baseline justify-between`}
          >
            <span>MONTH GOALS · {monthLabel(now)}</span>
            <span className={ACCENT.muted}>
              {daysRemainingInMonth(now)} DAYS REMAINING
            </span>
          </div>
          {goals.length === 0 ? (
            <div className={`pl-4 text-xs ${ACCENT.dim}`}>
              no goals set ·{" "}
              <Link to="/settings" className={`underline ${ACCENT.amber}`}>
                set goals
              </Link>
            </div>
          ) : (
            <div className="space-y-1 pl-4">
              {goals.map((g, i) => {
                const statusColor =
                  g.status === "hit"
                    ? ACCENT.green
                    : g.status === "missed"
                      ? ACCENT.red
                      : g.status === "at_risk"
                        ? ACCENT.amber
                        : ACCENT.muted;
                return (
                  <div
                    key={g.id}
                    className="flex items-baseline justify-between text-xs"
                  >
                    <span>
                      <span className={ACCENT.muted}>{i + 1}</span>{" "}
                      <span className="text-white">{g.claim}</span>
                    </span>
                    <span className={statusColor}>
                      {g.status.toUpperCase().replace("_", " ")}
                      {g.threshold_numeric !== null &&
                        g.current_value !== null && (
                          <span className={`${ACCENT.muted} ml-2`}>
                            · {g.current_value}/{g.threshold_numeric}
                          </span>
                        )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* LAST 7 DAYS TABLE */}
        <section className="mb-6">
          <div className={`border-t ${ACCENT.rule} pt-3 mb-3`}>
            <div className={`text-xs ${ACCENT.cyan} mb-2`}>LAST 7 DAYS</div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className={ACCENT.muted}>
                <th className="text-left font-normal">DATE</th>
                <th className="text-right font-normal">SLP</th>
                <th className="text-right font-normal">σ7</th>
                <th className="text-center font-normal">EX</th>
                <th className="text-center font-normal">DT</th>
                <th className="text-right font-normal">FLOW</th>
                <th className="text-left font-normal pl-4">VERDICT</th>
              </tr>
            </thead>
            <tbody>
              {last7Rows.map(({ date, inputs: i, flow: f }, idx) => (
                <tr
                  key={date}
                  className={idx === 0 ? ACCENT.amber : "text-white"}
                >
                  <td className="py-0.5">{date.slice(5).replace("-", "")}</td>
                  <td className="text-right">{i?.sleep_hours ?? "—"}</td>
                  <td className="text-right">
                    {i?.sleep_sigma_7d?.toFixed(1) ?? "—"}
                  </td>
                  <td
                    className={`text-center ${i?.exercise === false ? ACCENT.red : ""}`}
                  >
                    {i?.exercise === true
                      ? "Y"
                      : i?.exercise === false
                        ? "N"
                        : "·"}
                  </td>
                  <td
                    className={`text-center ${i?.diet === false ? ACCENT.red : ""}`}
                  >
                    {i?.diet === true ? "Y" : i?.diet === false ? "N" : "·"}
                  </td>
                  <td className="text-right">
                    {f?.flow_score ?? (idx === 0 ? "—" : "·")}
                  </td>
                  <td
                    className={`pl-4 ${idx === 0 ? ACCENT.amber : ACCENT.muted}`}
                  >
                    {idx === 0 ? "(today)" : (f?.verdict ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`mt-3 text-xs ${ACCENT.muted}`}>
            <Link to="/log" className="hover:underline">
              ▶ FULL LOG
            </Link>
          </div>
        </section>

        <div
          className={`border-t ${ACCENT.rule} pt-2 text-xs ${ACCENT.dim} text-center`}
        >
          NOCTISIUM · v3
        </div>
      </div>

      {captureBlock && (
        <CaptureModal
          block={captureBlock}
          onClose={() => setCaptureBlock(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
};

export default Terminal;
