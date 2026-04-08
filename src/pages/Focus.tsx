import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Loader2,
  Pencil,
  Power,
  Radar,
} from "lucide-react";
import { toast } from "sonner";
import { focusTokens } from "@/styles/focus-tokens";
import { FocusHeatmap } from "@/components/focus/FocusHeatmap";
import { EditFocusSessionDialog } from "@/components/focus/EditFocusSessionDialog";
import {
  buildFocusDayMap,
  focusService,
  formatClockLabel,
  formatFocusDuration,
  formatFocusTimer,
  getSessionDurationSeconds,
  sessionOverlapsRange,
  type FocusDaySummary,
  type FocusSession,
  type FocusSessionDraft,
} from "@/lib/focusService";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatDateStamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getPeriodTotalSeconds(
  summaries: FocusDaySummary[],
  start: Date,
  end: Date,
): number {
  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);

  return summaries
    .filter((summary) => summary.date >= startKey && summary.date <= endKey)
    .reduce((sum, summary) => sum + summary.totalSeconds, 0);
}

function DetailMetric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-white/8 bg-white/[0.02] px-4 py-3">
      <div
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ color: focusTokens.colors.textDim }}
      >
        {label}
      </div>
      <div
        className="mt-2 font-mono text-xl md:text-2xl"
        style={{
          color: accent
            ? focusTokens.colors.successStrong
            : focusTokens.colors.text,
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          className="mt-2 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: focusTokens.colors.textMuted }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function LiveClockText() {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>{clock.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })}</>
  );
}

function LiveElapsedTimer({
  activeSession,
  fallbackSeconds,
  fallbackLabel,
}: {
  activeSession: FocusSession | null;
  fallbackSeconds: number;
  fallbackLabel: string;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    activeSession ? getSessionDurationSeconds(activeSession, new Date()) : 0,
  );

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(getSessionDurationSeconds(activeSession, new Date()));
    const interval = window.setInterval(() => {
      setElapsedSeconds(getSessionDurationSeconds(activeSession, new Date()));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSession]);

  return (
    <>
      <div
        className="text-[11px] uppercase tracking-[0.42em]"
        style={{ color: focusTokens.colors.textDim }}
      >
        {activeSession ? "Elapsed" : "Accumulated"}
      </div>
      <div className="mt-6 font-mono text-5xl tracking-[0.14em] md:text-7xl">
        {formatFocusTimer(activeSession ? elapsedSeconds : fallbackSeconds)}
      </div>
      <div
        className="mt-5 text-[11px] uppercase tracking-[0.22em]"
        style={{ color: focusTokens.colors.textMuted }}
      >
        {activeSession
          ? `session live since ${formatClockLabel(activeSession.started_at)}`
          : fallbackLabel}
      </div>
    </>
  );
}

function SessionDurationValue({
  session,
  referenceNow,
}: {
  session: FocusSession;
  referenceNow: Date;
}) {
  const [duration, setDuration] = useState(() =>
    getSessionDurationSeconds(session, referenceNow),
  );

  useEffect(() => {
    if (!session.is_active) {
      setDuration(getSessionDurationSeconds(session, referenceNow));
      return;
    }

    setDuration(getSessionDurationSeconds(session, new Date()));
    const interval = window.setInterval(() => {
      setDuration(getSessionDurationSeconds(session, new Date()));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [session, referenceNow]);

  return <>{formatFocusDuration(duration)}</>;
}

function Panel({
  eyebrow,
  title,
  aside,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden border ${className}`}
      style={{
        backgroundColor: focusTokens.colors.panel,
        borderColor: focusTokens.colors.border,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_42%)]" />
      <div
        className="relative flex items-end justify-between gap-4 border-b px-5 py-4 md:px-6"
        style={{ borderColor: focusTokens.colors.border }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.35em]"
            style={{ color: focusTokens.colors.textDim }}
          >
            {eyebrow}
          </div>
          <div
            className="mt-3 font-mono text-lg uppercase md:text-xl"
            style={{ color: focusTokens.colors.text }}
          >
            {title}
          </div>
        </div>
        {aside ? (
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: focusTokens.colors.textDim }}
          >
            {aside}
          </div>
        ) : null}
      </div>
      <div className="relative px-5 py-5 md:px-6">{children}</div>
    </div>
  );
}

export default function Focus() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateKey(new Date()),
  );
  const [editingSession, setEditingSession] = useState<FocusSession | null>(
    null,
  );
  const [summaryNow, setSummaryNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const currentYear = summaryNow.getFullYear();
  const yearStart = useMemo(
    () => new Date(currentYear, 0, 1),
    [currentYear],
  );
  const yearEnd = useMemo(
    () => new Date(currentYear + 1, 0, 1),
    [currentYear],
  );
  const queryStart = useMemo(() => addDays(yearStart, -31), [yearStart]);
  const todayKey = useMemo(() => formatDateKey(summaryNow), [summaryNow]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchTime = new Date();
      const [rangeSessions, active] = await Promise.all([
        focusService.listSessionsForRange(queryStart, yearEnd),
        focusService.getActiveSession(),
      ]);

      setSessions(rangeSessions);
      setActiveSession(active);
      setSummaryNow(fetchTime);
    } catch (error) {
      console.error("Failed to load focus data:", error);
      toast.error("Failed to load focus data");
    } finally {
      setLoading(false);
    }
  }, [queryStart, yearEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleExternalUpdate = () => {
      loadData();
    };

    window.addEventListener("focusSessionsUpdated", handleExternalUpdate);
    return () => {
      window.removeEventListener("focusSessionsUpdated", handleExternalUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = window.setInterval(() => {
      setSummaryNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSession]);

  const dayMap = useMemo(
    () => buildFocusDayMap(sessions, summaryNow),
    [sessions, summaryNow],
  );
  const yearDayMap = useMemo(
    () => buildFocusDayMap(sessions, summaryNow, yearStart, yearEnd),
    [sessions, summaryNow, yearStart, yearEnd],
  );

  const allSummaries = useMemo(
    () => Array.from(dayMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    [dayMap],
  );
  const yearSummaries = useMemo(
    () => Array.from(yearDayMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    [yearDayMap],
  );

  const selectedSummary = yearDayMap.get(selectedDate) ?? dayMap.get(selectedDate);
  const todaySummary = dayMap.get(todayKey);
  const selectedSessions = useMemo(() => {
    const dayStart = new Date(`${selectedDate}T00:00:00`);
    const dayEnd = addDays(dayStart, 1);

    return sessions
      .filter((session) =>
        sessionOverlapsRange(session, dayStart, dayEnd, summaryNow),
      )
      .sort(
        (left, right) =>
          new Date(left.started_at).getTime() - new Date(right.started_at).getTime(),
      );
  }, [sessions, selectedDate, summaryNow]);

  const todayTotalSeconds = todaySummary?.totalSeconds ?? 0;
  const weekTotalSeconds = getPeriodTotalSeconds(
    allSummaries,
    startOfWeek(summaryNow),
    summaryNow,
  );
  const monthTotalSeconds = getPeriodTotalSeconds(
    allSummaries,
    startOfMonth(summaryNow),
    summaryNow,
  );

  const sevenDaySummaries = allSummaries.filter((summary) => {
    const start = addDays(new Date(`${todayKey}T12:00:00`), -6);
    return (
      summary.date >= formatDateKey(start) &&
      summary.date <= formatDateKey(summaryNow)
    );
  });
  const sevenDayAverageSeconds =
    sevenDaySummaries.length > 0
      ? Math.round(
          sevenDaySummaries.reduce((sum, summary) => sum + summary.totalSeconds, 0) /
            sevenDaySummaries.length,
        )
      : 0;
  const tenHourDaysThisMonth = allSummaries.filter(
    (summary) =>
      summary.date >= formatDateKey(startOfMonth(summaryNow)) &&
      summary.date <= formatDateKey(summaryNow) &&
      summary.totalSeconds >= 10 * 3600,
  ).length;

  const handleClockIn = async () => {
    setBusy(true);
    try {
      const session = await focusService.startSession();
      if (!session) {
        toast.error("Unable to start focus session");
        return;
      }

      setActiveSession(session);
      await loadData();
      toast.success(`Clocked in at ${formatClockLabel(session.started_at)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async () => {
    setBusy(true);
    try {
      const session = await focusService.stopSession();
      if (!session) {
        toast.error("Unable to stop focus session");
        return;
      }

      setActiveSession(null);
      await loadData();
      toast.success(
        `Clocked out at ${formatClockLabel(session.ended_at)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSession = async (
    sessionId: string,
    draft: FocusSessionDraft,
  ) => {
    try {
      const updated = await focusService.updateSession(sessionId, draft);
      if (!updated) {
        toast.error("Unable to save session window");
        return;
      }

      if (updated.is_active) {
        setActiveSession(updated);
      }
      await loadData();
      toast.success("Session window updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save session";
      toast.error(message);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const success = await focusService.deleteSession(sessionId);
    if (!success) {
      toast.error("Unable to delete session");
      return;
    }

    await loadData();
    toast.success("Session deleted");
  };

  return (
    <div
      className="relative -mx-4 -my-6 min-h-[calc(100vh-3.5rem)] overflow-hidden"
      style={{
        backgroundColor: focusTokens.colors.background,
        color: focusTokens.colors.text,
        fontFamily: focusTokens.fonts.mono,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:100%_100%,32px_32px,32px_32px]" />
      <div className="absolute inset-y-0 left-[18%] w-px bg-white/6" />
      <div className="absolute inset-y-0 right-[22%] w-px bg-white/6" />

      <div className="relative px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.45em]"
              style={{ color: focusTokens.colors.textDim }}
            >
              Focus Command Surface
            </div>
            <h1 className="mt-4 font-mono text-3xl uppercase tracking-[0.16em] md:text-5xl">
              Working Time
            </h1>
            <p
              className="mt-4 max-w-2xl text-xs uppercase tracking-[0.18em] md:text-[13px]"
              style={{ color: focusTokens.colors.textMuted }}
            >
              Exact start and finish windows. Compounding hours. Emerald days at
              ten hours and above.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:flex md:items-end md:gap-8">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: focusTokens.colors.textDim }}
              >
                Local Date
              </div>
              <div className="mt-2 font-mono text-lg">
                {formatDateStamp(summaryNow)}
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: focusTokens.colors.textDim }}
              >
                System Time
              </div>
              <div className="mt-2 font-mono text-lg">
                <LiveClockText />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2
              className="h-10 w-10 animate-spin"
              style={{ color: focusTokens.colors.textDim }}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.35fr_0.85fr]">
              <Panel eyebrow="Window Markers" title="Day Boundaries">
                <div className="grid gap-3">
                  <DetailMetric
                    label="First In Today"
                    value={formatClockLabel(todaySummary?.firstStartedAt ?? null)}
                    hint={todaySummary ? "initial focus boundary" : "waiting for first session"}
                  />
                  <DetailMetric
                    label="Last Out Today"
                    value={
                      activeSession
                        ? "LIVE"
                        : formatClockLabel(todaySummary?.lastEndedAt ?? null)
                    }
                    hint={
                      activeSession
                        ? `running since ${formatClockLabel(activeSession.started_at)}`
                        : "latest completed session"
                    }
                    accent={Boolean(activeSession)}
                  />
                  <DetailMetric
                    label="First In Selected"
                    value={formatClockLabel(selectedSummary?.firstStartedAt ?? null)}
                    hint={formatLongDate(selectedDate)}
                  />
                  <DetailMetric
                    label="Last Out Selected"
                    value={
                      selectedDate === todayKey && activeSession
                        ? "LIVE"
                        : formatClockLabel(selectedSummary?.lastEndedAt ?? null)
                    }
                    hint={formatLongDate(selectedDate)}
                  />
                </div>
              </Panel>

              <div
                className="relative overflow-hidden border"
                style={{
                  backgroundColor: focusTokens.colors.panelRaised,
                  borderColor: focusTokens.colors.borderStrong,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(174,247,168,0.16),transparent_34%)]" />
                <div className="absolute inset-x-8 top-[96px] h-px bg-white/10" />
                <div className="absolute bottom-[108px] left-8 right-8 h-px bg-white/10" />

                <div className="relative px-6 py-6 md:px-8 md:py-8">
                  <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div
                        className="text-[10px] uppercase tracking-[0.35em]"
                        style={{ color: focusTokens.colors.textDim }}
                      >
                        {activeSession ? "Active Session" : "Today Total"}
                      </div>
                      <div
                        className="mt-3 text-[11px] uppercase tracking-[0.18em]"
                        style={{ color: focusTokens.colors.textMuted }}
                      >
                        {activeSession
                          ? `window opened ${formatClockLabel(activeSession.started_at)}`
                          : "ready for next clock in"}
                      </div>
                    </div>

                    <div
                      className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.22em]"
                      style={{
                        borderColor: activeSession
                          ? "rgba(174,247,168,0.35)"
                          : focusTokens.colors.border,
                        color: activeSession
                          ? focusTokens.colors.successStrong
                          : focusTokens.colors.textDim,
                        backgroundColor: activeSession
                          ? "rgba(174,247,168,0.05)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Radar className="h-3.5 w-3.5" />
                      {activeSession ? "Live" : "Standby"}
                    </div>
                  </div>

                  <motion.div
                    key={activeSession ? activeSession.id : "today-total"}
                    initial={{ opacity: 0.3, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="py-10 text-center"
                  >
                    <LiveElapsedTimer
                      activeSession={activeSession}
                      fallbackSeconds={todayTotalSeconds}
                      fallbackLabel={`${formatFocusDuration(todayTotalSeconds)} logged today`}
                    />
                  </motion.div>

                  <div className="grid gap-3 border-t border-white/10 pt-6 md:grid-cols-3">
                    <DetailMetric
                      label="Today"
                      value={formatFocusDuration(todayTotalSeconds)}
                    />
                    <DetailMetric
                      label="This Week"
                      value={formatFocusDuration(weekTotalSeconds)}
                    />
                    <DetailMetric
                      label="7D Average"
                      value={formatFocusDuration(sevenDayAverageSeconds)}
                      hint="per active day"
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={activeSession ? handleClockOut : handleClockIn}
                      disabled={busy}
                      className="flex-1 border px-4 py-3 font-mono text-xs uppercase tracking-[0.28em] transition-colors disabled:opacity-60"
                      style={{
                        borderColor: activeSession
                          ? "rgba(255,142,142,0.4)"
                          : "rgba(174,247,168,0.4)",
                        backgroundColor: activeSession
                          ? "rgba(255,142,142,0.08)"
                          : "rgba(174,247,168,0.08)",
                        color: activeSession
                          ? focusTokens.colors.danger
                          : focusTokens.colors.successStrong,
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        {busy
                          ? "Processing"
                          : activeSession
                            ? "Clock Out"
                            : "Clock In"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayKey)}
                      className="border px-4 py-3 font-mono text-xs uppercase tracking-[0.28em] transition-colors hover:bg-white/5"
                      style={{
                        borderColor: focusTokens.colors.border,
                        color: focusTokens.colors.textMuted,
                      }}
                    >
                      Jump To Today
                    </button>
                  </div>
                </div>
              </div>

              <Panel eyebrow="Compounding Output" title="Current Run">
                <div className="grid gap-3">
                  <DetailMetric
                    label="Month Total"
                    value={formatFocusDuration(monthTotalSeconds)}
                    hint="current month accumulation"
                  />
                  <DetailMetric
                    label="10h Days"
                    value={`${tenHourDaysThisMonth}`}
                    hint="this month"
                    accent={tenHourDaysThisMonth > 0}
                  />
                  <DetailMetric
                    label="Today Total"
                    value={formatFocusDuration(todayTotalSeconds)}
                    hint="current day accumulation"
                  />
                  <DetailMetric
                    label="Selected Day"
                    value={selectedSummary ? `${selectedSummary.totalHours.toFixed(1)}h` : "0.0h"}
                    hint={formatLongDate(selectedDate)}
                  />
                </div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
              <FocusHeatmap
                year={currentYear}
                summaries={yearSummaries}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              <div className="grid gap-4">
                <Panel
                  eyebrow="Session Ledger"
                  title={formatLongDate(selectedDate)}
                  aside={`${selectedSessions.length} ${selectedSessions.length === 1 ? "window" : "windows"}`}
                >
                  <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <DetailMetric
                      label="First In"
                      value={formatClockLabel(selectedSummary?.firstStartedAt ?? null)}
                    />
                    <DetailMetric
                      label="Last Out"
                      value={
                        selectedDate === todayKey && activeSession
                          ? "LIVE"
                          : formatClockLabel(selectedSummary?.lastEndedAt ?? null)
                      }
                    />
                    <DetailMetric
                      label="Total"
                      value={
                        selectedSummary
                          ? `${selectedSummary.totalHours.toFixed(1)}h`
                          : "0.0h"
                      }
                      accent={Boolean(selectedSummary && selectedSummary.totalHours >= 10)}
                    />
                  </div>

                  {selectedSessions.length === 0 ? (
                    <div
                      className="border px-4 py-8 text-center text-xs uppercase tracking-[0.2em]"
                      style={{
                        borderColor: focusTokens.colors.border,
                        color: focusTokens.colors.textMuted,
                      }}
                    >
                      No tracked windows for this day yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedSessions.map((session) => {
                        return (
                          <div
                            key={session.id}
                            className="border px-4 py-4"
                            style={{
                              borderColor: session.is_active
                                ? "rgba(174,247,168,0.35)"
                                : focusTokens.colors.border,
                              backgroundColor: session.is_active
                                ? "rgba(174,247,168,0.04)"
                                : "rgba(255,255,255,0.02)",
                            }}
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-[10px] uppercase tracking-[0.24em]"
                                    style={{
                                      color: session.is_active
                                        ? focusTokens.colors.successStrong
                                        : focusTokens.colors.textDim,
                                    }}
                                  >
                                    {session.is_active ? "Live Window" : "Focus Window"}
                                  </span>
                                  {session.note ? (
                                    <span
                                      className="truncate border px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
                                      style={{
                                        borderColor: focusTokens.colors.border,
                                        color: focusTokens.colors.textMuted,
                                      }}
                                    >
                                      {session.note}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm md:text-base">
                                  <span>{formatClockLabel(session.started_at)}</span>
                                  <ArrowUpRight
                                    className="h-3.5 w-3.5"
                                    style={{ color: focusTokens.colors.textDim }}
                                  />
                                  <span>
                                    {session.is_active
                                      ? "LIVE"
                                      : formatClockLabel(session.ended_at)}
                                  </span>
                                </div>

                                <div
                                  className="mt-2 text-[10px] uppercase tracking-[0.18em]"
                                  style={{ color: focusTokens.colors.textMuted }}
                                >
                                  {new Date(session.started_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                  })}
                                  {session.ended_at
                                    ? ` to ${new Date(session.ended_at).toLocaleDateString(
                                        "en-US",
                                        {
                                          month: "short",
                                          day: "2-digit",
                                        },
                                      )}`
                                    : ""}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-mono text-lg">
                                    <SessionDurationValue
                                      session={session}
                                      referenceNow={summaryNow}
                                    />
                                  </div>
                                  <div
                                    className="text-[10px] uppercase tracking-[0.18em]"
                                    style={{ color: focusTokens.colors.textDim }}
                                  >
                                    exact elapsed
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingSession(session)}
                                  className="border p-2 transition-colors hover:bg-white/5"
                                  style={{ borderColor: focusTokens.colors.border }}
                                  aria-label="Edit session"
                                >
                                  <Pencil
                                    className="h-4 w-4"
                                    style={{ color: focusTokens.colors.textMuted }}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>

      <EditFocusSessionDialog
        session={editingSession}
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null);
          }
        }}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
      />
    </div>
  );
}
