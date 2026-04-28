import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  type BlockInstanceWithLabel,
  type BlockKind,
  clockIn,
  clockOut,
  findActiveBlock,
  listForDate,
  markSkipped,
  setEndedAt,
  setRoutineState,
  setStartedAt,
} from "@/lib/blockService";
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
  type OperatorSettings,
  getOperatorSettings,
} from "@/lib/operatorSettingsService";
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
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

const fmtElapsed = (startedAtIso: string | null): string => {
  if (!startedAtIso) return "00:00:00";
  const ms = Date.now() - new Date(startedAtIso).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
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
      await clockOut(block.id, block.kind, text);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const isJudged = block.kind === "judged";
  const prompt = isJudged
    ? "WHAT DID YOU DO? (THE LLM JUDGES IF IT WAS A GOOD USE OF TIME)"
    : "ANY NOTES? (OPTIONAL — JUST FOR YOUR LOG, NO LLM JUDGMENT)";
  const placeholder = isJudged
    ? "be specific. artifacts, decisions, distractions"
    : "thoughts, takeaways, anything worth remembering";
  const submitLabel = busy
    ? isJudged
      ? "judging..."
      : "saving..."
    : "⏹ CLOCK OUT";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-24 z-50 px-4">
      <div className="w-full max-w-xl bg-black border border-[#444] p-6 font-mono">
        <div className={`text-xs ${ACCENT.cyan} mb-1`}>CLOCK OUT</div>
        <div className="text-sm text-white mb-4">
          {block.label.toUpperCase()} · planned {trimSec(block.start_time)}–
          {trimSec(block.end_time)} ·{" "}
          <span className="tabular-nums">{fmtElapsed(block.started_at)}</span>
        </div>
        <div className={`text-xs ${ACCENT.muted} mb-2`}>{prompt}</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={5}
          autoFocus
          placeholder={placeholder}
          className="w-full bg-black border border-[#444] text-white p-3 text-sm focus:border-[#00D4FF] focus:outline-none resize-none"
        />
        <div className={`text-xs ${ACCENT.dim} text-right mt-1`}>
          {text.length}/500
        </div>
        {error && <div className={`text-xs ${ACCENT.red} mt-2`}>{error}</div>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={submit}
            disabled={busy || (isJudged && !text.trim())}
            className={`flex-1 border ${ACCENT.cyan} border-current py-2 text-xs hover:bg-[#00D4FF]/10 disabled:opacity-30`}
          >
            {submitLabel}
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
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
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
      className={`bg-transparent text-white border-b border-[#444] focus:border-[#00D4FF] focus:outline-none ${
        compact ? "px-0.5 text-xs w-16" : "px-1"
      }`}
    />
  );
}

const localHHMM = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function qualityClass(score: number | null): string {
  if (score === null) return "";
  if (score >= 80) return ACCENT.green;
  if (score >= 60) return "text-white";
  if (score >= 40) return ACCENT.amber;
  return ACCENT.red;
}

function BlockRow({
  block: b,
  today,
  onClockIn,
  onClockOut,
  onSkip,
  onRoutineToggle,
  onEditStart,
  onEditEnd,
}: {
  block: BlockInstanceWithLabel;
  today: string;
  onClockIn: () => void;
  onClockOut: () => void;
  onSkip: () => void;
  onRoutineToggle: (v: boolean | null) => void;
  onEditStart: (hhmm: string) => void;
  onEditEnd: (hhmm: string) => void;
}) {
  const isRoutine = b.kind === "routine";
  const isActive = b.status === "active";
  const accent = isActive ? ACCENT.amber : "";
  const isToday = b.date === today;

  // Routine row: planned time · label · [Y][N] · status text. No clock in/out.
  if (isRoutine) {
    const value: boolean | null =
      b.status === "captured" ? true : b.status === "skipped" ? false : null;
    const statusText =
      b.status === "captured" ? (
        <span className={ACCENT.green}>DONE</span>
      ) : b.status === "skipped" ? (
        <span className={ACCENT.red}>SKIPPED</span>
      ) : b.status === "missed" ? (
        <span className={ACCENT.red}>MISSED</span>
      ) : (
        <span className={ACCENT.dim}>—</span>
      );
    return (
      <div className="flex items-center gap-4 text-xs">
        <span className={`w-24 ${ACCENT.muted}`}>
          {trimSec(b.start_time)}–{trimSec(b.end_time)}
        </span>
        <span className="w-40 truncate text-white">
          {b.label.toUpperCase()}
        </span>
        <span className="flex-1">{statusText}</span>
        <YNToggle value={value} onChange={onRoutineToggle} />
      </div>
    );
  }

  // Non-routine (judged + note): keep clock in/out, but make times editable.
  return (
    <div className={`flex items-center gap-4 text-xs ${accent}`}>
      <span className={`w-24 ${accent || ACCENT.muted}`}>
        {trimSec(b.start_time)}–{trimSec(b.end_time)}
      </span>
      <span className={`w-40 truncate ${accent || "text-white"}`}>
        {b.label.toUpperCase()}
      </span>
      <span className="flex-1 truncate flex items-center gap-2">
        {b.status === "active" && (
          <>
            <span className={ACCENT.amber}>▶ ACTIVE</span>
            <span className={ACCENT.muted}>started</span>
            {isToday ? (
              <TimeField
                value={localHHMM(b.started_at)}
                onChange={onEditStart}
                compact
              />
            ) : (
              <span className="text-white">{localHHMM(b.started_at)}</span>
            )}
          </>
        )}
        {b.status === "captured" && (
          <>
            {b.kind === "judged" && b.quality_score !== null && (
              <span className={`${qualityClass(b.quality_score)} font-bold`}>
                {b.quality_score}
              </span>
            )}
            <span className={`${ACCENT.muted} truncate max-w-[24rem]`}>
              {b.kind === "judged"
                ? (b.quality_verdict ?? b.results_summary ?? "captured")
                : (b.results_text ?? "noted")}
            </span>
            {(b.started_at || b.ended_at) && (
              <span className={`${ACCENT.dim} flex items-center gap-1 ml-2`}>
                {isToday ? (
                  <>
                    <TimeField
                      value={localHHMM(b.started_at)}
                      onChange={onEditStart}
                      compact
                    />
                    <span>→</span>
                    <TimeField
                      value={localHHMM(b.ended_at)}
                      onChange={onEditEnd}
                      compact
                    />
                  </>
                ) : (
                  <span>
                    {localHHMM(b.started_at)} → {localHHMM(b.ended_at)}
                  </span>
                )}
              </span>
            )}
          </>
        )}
        {b.status === "missed" && <span className={ACCENT.red}>MISSED</span>}
        {b.status === "skipped" && <span className={ACCENT.dim}>SKIPPED</span>}
        {b.status === "pending" && <span className={ACCENT.dim}>PENDING</span>}
        {b.status === "adhoc" && (
          <span className={ACCENT.muted}>{b.results_summary ?? "ad-hoc"}</span>
        )}
      </span>
      {b.status === "pending" && (
        <>
          <button
            onClick={onClockIn}
            className={`text-xs ${ACCENT.cyan} hover:underline`}
          >
            [ ▶ CLOCK IN ]
          </button>
          <button
            onClick={onSkip}
            className={`text-xs ${ACCENT.dim} hover:text-[#FF3344]`}
          >
            ✗
          </button>
        </>
      )}
      {b.status === "active" && (
        <button
          onClick={onClockOut}
          className={`text-xs ${ACCENT.amber} hover:underline`}
        >
          [ ⏹ CLOCK OUT ]
        </button>
      )}
    </div>
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
  const [settings, setSettings] = useState<OperatorSettings | null>(null);

  const loadAll = useCallback(async () => {
    // Fetch 13 days so the rolling 7-day σ for the oldest displayed row
    // (today-6) has its full window (today-12 .. today-6) available.
    const start = offsetDateStr(12);
    let b: BlockInstanceWithLabel[] = [],
      i: DailyInputs | null = null,
      f: DailyFlow | null = null,
      g: MonthlyGoal[] = [],
      range7Inputs: DailyInputs[] = [],
      range7Flow: DailyFlow[] = [],
      s: OperatorSettings | null = null;
    try {
      [b, i, f, g, range7Inputs, range7Flow, s] = await Promise.all([
        listForDate(today).catch(() => []),
        getInputs(today).catch(() => null),
        getFlow(today).catch(() => null),
        listGoalsForMonth().catch(() => []),
        getInputsRange(start, today).catch(() => []),
        getFlowRange(start, today).catch(() => []),
        getOperatorSettings().catch(() => null),
      ]);
      setSettings(s);
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
  }, [loadAll, today]);

  // Clock tick: 1s when a block is active (drives the elapsed timer),
  // 30s otherwise (just keeps the wall clock fresh).
  const hasActive = blocks.some((b) => b.status === "active");
  useEffect(() => {
    const interval = hasActive ? 1000 : 30_000;
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [hasActive]);

  const active = findActiveBlock(blocks);
  const captured = blocks.filter(
    (b) => b.status === "captured" || b.status === "adhoc",
  ).length;
  const dayLabel = profile?.display_name?.toUpperCase() ?? "OPERATOR";

  // Today's sleep offset from target schedule (client-side, since SQL fn extracts UTC).
  const targetBed = settings?.target_bedtime?.slice(0, 5) ?? "23:00";
  const targetWake = settings?.target_wake_time?.slice(0, 5) ?? "07:00";
  const todayOffset = computeSleepOffsetMin(
    inputs?.sleep_start_at ?? null,
    inputs?.sleep_end_at ?? null,
    targetBed,
    targetWake,
  );

  const handleClockOut = async (b: BlockInstanceWithLabel) => {
    if (b.kind === "routine") {
      // Instant clock-out, no modal, no LLM
      await clockOut(b.id, "routine", "");
      loadAll();
    } else {
      setCaptureBlock(b);
    }
  };

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
    <div className="min-h-screen bg-black text-white font-mono px-4 py-3 text-sm">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-1.5 mb-3`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM TERMINAL</span> ·{" "}
              <span className="text-white">{dayLabel}</span> ·{" "}
              <span className={ACCENT.muted}>{fmtDateLong(now)}</span>
            </span>
            <span className={`${ACCENT.muted} tabular-nums`}>
              {fmtClock(now)} LOCAL
            </span>
          </div>
        </div>

        {/* Active block banner */}
        {active && !captureBlock && (
          <div
            className={`border ${ACCENT.amber} border-current p-2 mb-3 flex items-center justify-between`}
          >
            <span className="text-xs flex items-center gap-2">
              <span className={ACCENT.amber}>▶</span>
              <span>{active.label.toUpperCase()}</span>
              <span className={ACCENT.muted}>·</span>
              <span className="text-white tabular-nums">
                {fmtElapsed(active.started_at)}
              </span>
              <span className={ACCENT.muted}>· started</span>
              <TimeField
                value={localHHMM(active.started_at)}
                onChange={async (hhmm) => {
                  await setStartedAt(active.id, today, hhmm);
                  loadAll();
                }}
                compact
              />
            </span>
            <button
              onClick={() => handleClockOut(active)}
              className={`px-3 py-1 text-xs ${ACCENT.amber} hover:bg-[#FFB800]/10`}
            >
              [ ⏹ CLOCK OUT ]
            </button>
          </div>
        )}

        {/* INPUTS — single horizontal strip */}
        <section className="mb-3 border border-[#222] p-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className={`text-xs ${ACCENT.cyan} mr-2`}>INPUTS</span>
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
                  todayOffset == null
                    ? ACCENT.dim
                    : todayOffset <= 15
                      ? ACCENT.green
                      : todayOffset <= 45
                        ? "text-white"
                        : todayOffset <= 90
                          ? ACCENT.amber
                          : ACCENT.red
                }
                title={`vs target ${targetBed}–${targetWake}`}
              >
                {todayOffset?.toFixed(0) ?? "—"}
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

        {/* Main grid: SCHEDULE left, FLOW + GOALS + RESULTS right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3 mb-3">
          <div>
            {/* SCHEDULE */}
            <section className="mb-3">
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
                  {blocks.map((b) => (
                    <BlockRow
                      key={b.id}
                      block={b}
                      today={today}
                      onClockIn={async () => {
                        await clockIn(b.id);
                        loadAll();
                      }}
                      onClockOut={() => handleClockOut(b)}
                      onSkip={async () => {
                        await markSkipped(b.id);
                        loadAll();
                      }}
                      onRoutineToggle={async (v) => {
                        await setRoutineState(b.id, v);
                        loadAll();
                      }}
                      onEditStart={async (hhmm) => {
                        await setStartedAt(b.id, today, hhmm);
                        loadAll();
                      }}
                      onEditEnd={async (hhmm) => {
                        await setEndedAt(b.id, today, hhmm);
                        loadAll();
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
          <div>
            {/* DAILY FLOW */}
            <section className="mb-3 border border-[#222] p-3">
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
              {flow ? (
                <div>
                  <div className="text-white text-4xl tabular-nums leading-none">
                    {flow.flow_score}
                  </div>
                  <div className={`mt-1 text-xs ${ACCENT.muted}`}>
                    {flow.verdict}
                  </div>
                </div>
              ) : (
                <div className={`text-xs ${ACCENT.dim}`}>—</div>
              )}
            </section>

            {/* RESULTS LOGGED */}
            <section className="mb-3 border border-[#222] p-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className={ACCENT.cyan}>RESULTS LOGGED</span>
                <span className="text-white tabular-nums text-base">
                  {captured}/{blocks.length}
                </span>
              </div>
            </section>

            {/* MONTH GOALS */}
            <section className="mb-3 border border-[#222] p-3">
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
          </div>
        </div>
        {/* end main grid */}

        {/* LAST 7 DAYS TABLE */}
        <section className="mb-3">
          <div className={`border-t ${ACCENT.rule} pt-2 mb-2`}>
            <div className={`text-xs ${ACCENT.cyan}`}>LAST 7 DAYS</div>
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
                    {computeSleepSigma7d(
                      last7Inputs,
                      date,
                      targetBed,
                      targetWake,
                    )?.toFixed(0) ?? "—"}
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
