import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  type BlockInstanceWithLabel,
  clockIn,
  clockOut,
  findActiveBlock,
  listForDate,
  markSkipped,
} from "@/lib/blockService";
import {
  type DailyInputs,
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

function ClockOutModal({
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
      await clockOut(block.id, text);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const elapsed = block.started_at
    ? Math.round((Date.now() - new Date(block.started_at).getTime()) / 60000)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-24 z-50 px-4">
      <div className="w-full max-w-xl bg-black border border-[#444] p-6 font-mono">
        <div className={`text-xs ${ACCENT.cyan} mb-1`}>CLOCK OUT</div>
        <div className="text-sm text-white mb-4">
          {block.label.toUpperCase()} · planned {trimSec(block.start_time)}–
          {trimSec(block.end_time)} · clocked in {elapsed}m
        </div>
        <div className={`text-xs ${ACCENT.muted} mb-2`}>
          WHAT DID YOU DO? (THE LLM JUDGES IF IT WAS A GOOD USE OF TIME)
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={5}
          autoFocus
          placeholder="be specific. artifacts, decisions, distractions"
          className="w-full bg-black border border-[#444] text-white p-3 text-sm focus:border-[#00D4FF] focus:outline-none resize-none"
        />
        <div className={`text-xs ${ACCENT.dim} text-right mt-1`}>
          {text.length}/500
        </div>
        {error && <div className={`text-xs ${ACCENT.red} mt-2`}>{error}</div>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className={`flex-1 border ${ACCENT.cyan} border-current py-2 text-xs hover:bg-[#00D4FF]/10 disabled:opacity-30`}
          >
            {busy ? "judging..." : "⏹ CLOCK OUT"}
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

function TimeField({
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
      className="bg-transparent text-white border-b border-[#444] focus:border-[#00D4FF] focus:outline-none px-1"
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
    // Once-per-day idempotent cron: materialize today's block_instances,
    // refresh sigma7, refresh monthly_goals.status. Safe to call on every load.
    const cronMarker = localStorage.getItem("noctisium:cron:date");
    const ranToday = cronMarker === today;
    const runCron = async () => {
      if (ranToday) return;
      try {
        await supabase.functions.invoke("operator-cron", { body: {} });
        localStorage.setItem("noctisium:cron:date", today);
      } catch (err) {
        console.warn("operator-cron invoke failed:", err);
      }
    };
    runCron().finally(loadAll);

    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [loadAll, today]);

  const active = findActiveBlock(blocks);
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

        {/* Active block banner */}
        {active && !captureBlock && (
          <div
            className={`border ${ACCENT.amber} border-current p-3 mb-6 flex items-center justify-between`}
          >
            <span className="text-xs">
              <span className={ACCENT.amber}>▶</span>{" "}
              {active.label.toUpperCase()} · CLOCKED IN
              {active.started_at && (
                <span className={ACCENT.muted}>
                  {" "}
                  ·{" "}
                  {Math.round(
                    (Date.now() - new Date(active.started_at).getTime()) /
                      60000,
                  )}
                  m elapsed
                </span>
              )}
            </span>
            <button
              onClick={() => setCaptureBlock(active)}
              className={`px-3 py-1 text-xs ${ACCENT.amber} hover:bg-[#FFB800]/10`}
            >
              [ ⏹ CLOCK OUT ]
            </button>
          </div>
        )}

        {/* INPUTS */}
        <section className="mb-6">
          <div className={`text-xs ${ACCENT.cyan} mb-2`}>INPUTS · TODAY</div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm pl-4">
            <span>
              <span className={ACCENT.muted}>BED </span>
              <TimeField
                value={formatLocalHHMM(inputs?.sleep_start_at ?? null)}
                onChange={async (bed) => {
                  await setBedTime(today, bed || null);
                  setInputs(await getInputs(today));
                }}
              />
            </span>
            <span>
              <span className={ACCENT.muted}>WAKE </span>
              <TimeField
                value={formatLocalHHMM(inputs?.sleep_end_at ?? null)}
                onChange={async (wake) => {
                  await setWakeTime(today, wake || null);
                  setInputs(await getInputs(today));
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
              <span
                className={
                  inputs?.sleep_sigma_7d == null
                    ? ACCENT.dim
                    : inputs.sleep_sigma_7d <= 15
                      ? ACCENT.green
                      : inputs.sleep_sigma_7d <= 45
                        ? "text-white"
                        : inputs.sleep_sigma_7d <= 90
                          ? ACCENT.amber
                          : ACCENT.red
                }
              >
                {inputs?.sleep_sigma_7d?.toFixed(0) ?? "—"}
              </span>
              <span className={ACCENT.muted}>m</span>
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
                const isActive = b.status === "active";
                const accent = isActive ? ACCENT.amber : "";
                const qualityColor =
                  b.quality_score === null
                    ? ""
                    : b.quality_score >= 80
                      ? ACCENT.green
                      : b.quality_score >= 60
                        ? "text-white"
                        : b.quality_score >= 40
                          ? ACCENT.amber
                          : ACCENT.red;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-4 text-xs ${accent}`}
                  >
                    <span className={`w-24 ${accent || ACCENT.muted}`}>
                      {trimSec(b.start_time)}–{trimSec(b.end_time)}
                    </span>
                    <span className={`w-40 truncate ${accent || "text-white"}`}>
                      {b.label.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">
                      {b.status === "active" && (
                        <span className={ACCENT.amber}>▶ ACTIVE</span>
                      )}
                      {b.status === "captured" && (
                        <>
                          {b.quality_score !== null && (
                            <span className={`${qualityColor} mr-2`}>
                              {b.quality_score}
                            </span>
                          )}
                          <span className={ACCENT.muted}>
                            {b.quality_verdict ??
                              b.results_summary ??
                              "captured"}
                          </span>
                        </>
                      )}
                      {b.status === "missed" && (
                        <span className={ACCENT.red}>MISSED</span>
                      )}
                      {b.status === "skipped" && (
                        <span className={ACCENT.dim}>SKIPPED</span>
                      )}
                      {b.status === "pending" && (
                        <span className={ACCENT.dim}>PENDING</span>
                      )}
                      {b.status === "adhoc" && (
                        <span className={ACCENT.muted}>
                          {b.results_summary ?? "ad-hoc"}
                        </span>
                      )}
                    </span>
                    {b.status === "pending" && (
                      <>
                        <button
                          onClick={async () => {
                            await clockIn(b.id);
                            loadAll();
                          }}
                          className={`text-xs ${ACCENT.cyan} hover:underline`}
                        >
                          [ ▶ CLOCK IN ]
                        </button>
                        <button
                          onClick={async () => {
                            await markSkipped(b.id);
                            loadAll();
                          }}
                          className={`text-xs ${ACCENT.dim} hover:text-[#FF3344]`}
                        >
                          ✗
                        </button>
                      </>
                    )}
                    {b.status === "active" && (
                      <button
                        onClick={() => setCaptureBlock(b)}
                        className={`text-xs ${ACCENT.amber} hover:underline`}
                      >
                        [ ⏹ CLOCK OUT ]
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
        <ClockOutModal
          block={captureBlock}
          onClose={() => setCaptureBlock(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
};

export default Terminal;
