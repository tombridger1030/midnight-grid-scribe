import { supabase } from "@/lib/supabase";
import { formatLocalDate } from "@/lib/dateUtils";

export interface FocusSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FocusSessionDraft {
  startedAt: string;
  endedAt: string | null;
  note?: string | null;
}

export interface FocusSessionSegment {
  sessionId: string;
  date: string;
  segmentStart: string;
  segmentEnd: string;
  seconds: number;
  isActive: boolean;
}

export interface FocusDaySummary {
  date: string;
  totalSeconds: number;
  totalHours: number;
  firstStartedAt: string | null;
  lastEndedAt: string | null;
  sessions: FocusSession[];
}

export interface FocusTimingInsights {
  averageStartMinutes7: number | null;
  averageStartMinutes30: number | null;
  averageEndMinutes7: number | null;
  averageEndMinutes30: number | null;
  earliestStartMinutesThisWeek: number | null;
  tenHourDaysThisMonth: number;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
}

function overlapStart(
  sessionStart: Date,
  rangeStart?: Date,
): Date {
  if (!rangeStart) return sessionStart;
  return sessionStart > rangeStart ? sessionStart : rangeStart;
}

function overlapEnd(
  sessionEnd: Date,
  rangeEnd?: Date,
): Date {
  if (!rangeEnd) return sessionEnd;
  return sessionEnd < rangeEnd ? sessionEnd : rangeEnd;
}

export function resolveSessionEnd(
  session: Pick<FocusSession, "ended_at" | "is_active">,
  now: Date = new Date(),
): Date {
  if (session.ended_at) {
    return new Date(session.ended_at);
  }

  return session.is_active ? now : now;
}

export function getSessionDurationSeconds(
  session: Pick<FocusSession, "started_at" | "ended_at" | "is_active" | "duration_seconds">,
  now: Date = new Date(),
): number {
  if (!session.is_active && typeof session.duration_seconds === "number") {
    return Math.max(0, session.duration_seconds);
  }

  const startedAt = new Date(session.started_at);
  const endedAt = resolveSessionEnd(session, now);
  const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

  return Math.max(0, duration);
}

export function sessionOverlapsRange(
  session: Pick<FocusSession, "started_at" | "ended_at" | "is_active">,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date = new Date(),
): boolean {
  const startedAt = new Date(session.started_at);
  const endedAt = resolveSessionEnd(session, now);
  return startedAt < rangeEnd && endedAt > rangeStart;
}

export function splitSessionByDay(
  session: FocusSession,
  now: Date = new Date(),
  rangeStart?: Date,
  rangeEnd?: Date,
): FocusSessionSegment[] {
  const sessionStart = new Date(session.started_at);
  const sessionEnd = resolveSessionEnd(session, now);

  if (sessionEnd <= sessionStart) {
    return [];
  }

  const effectiveStart = overlapStart(sessionStart, rangeStart);
  const effectiveEnd = overlapEnd(sessionEnd, rangeEnd);

  if (effectiveEnd <= effectiveStart) {
    return [];
  }

  const segments: FocusSessionSegment[] = [];
  let cursor = new Date(startOfDay(effectiveStart));

  while (cursor < effectiveEnd) {
    const nextDay = endOfDay(cursor);
    const segmentStart = new Date(
      Math.max(sessionStart.getTime(), effectiveStart.getTime(), cursor.getTime()),
    );
    const segmentEnd = new Date(
      Math.min(sessionEnd.getTime(), effectiveEnd.getTime(), nextDay.getTime()),
    );

    if (segmentEnd > segmentStart) {
      segments.push({
        sessionId: session.id,
        date: formatLocalDate(segmentStart),
        segmentStart: segmentStart.toISOString(),
        segmentEnd: segmentEnd.toISOString(),
        seconds: Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / 1000),
        isActive: session.is_active,
      });
    }

    cursor = nextDay;
  }

  return segments;
}

export function buildFocusDayMap(
  sessions: FocusSession[],
  now: Date = new Date(),
  rangeStart?: Date,
  rangeEnd?: Date,
): Map<string, FocusDaySummary> {
  const dayMap = new Map<string, FocusDaySummary>();

  sessions.forEach((session) => {
    const segments = splitSessionByDay(session, now, rangeStart, rangeEnd);

    segments.forEach((segment) => {
      const existing = dayMap.get(segment.date) ?? {
        date: segment.date,
        totalSeconds: 0,
        totalHours: 0,
        firstStartedAt: null,
        lastEndedAt: null,
        sessions: [],
      };

      existing.totalSeconds += segment.seconds;
      existing.totalHours = Number((existing.totalSeconds / 3600).toFixed(2));

      if (
        !existing.firstStartedAt ||
        new Date(segment.segmentStart).getTime() <
          new Date(existing.firstStartedAt).getTime()
      ) {
        existing.firstStartedAt = segment.segmentStart;
      }

      if (
        !existing.lastEndedAt ||
        new Date(segment.segmentEnd).getTime() >
          new Date(existing.lastEndedAt).getTime()
      ) {
        existing.lastEndedAt = segment.segmentEnd;
      }

      if (!existing.sessions.some((item) => item.id === session.id)) {
        existing.sessions.push(session);
      }

      dayMap.set(segment.date, existing);
    });
  });

  return dayMap;
}

function getMinutesSinceMidnight(dateString: string): number {
  const date = new Date(dateString);
  return date.getHours() * 60 + date.getMinutes();
}

function averageMinutes(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function filterSummariesWithinWindow(
  dayMap: Map<string, FocusDaySummary>,
  start: Date,
  end: Date,
): FocusDaySummary[] {
  return Array.from(dayMap.values()).filter((summary) => {
    const day = new Date(`${summary.date}T12:00:00`);
    return day >= start && day <= end;
  });
}

export function buildTimingInsights(
  dayMap: Map<string, FocusDaySummary>,
  now: Date = new Date(),
): FocusTimingInsights {
  const end = new Date(`${formatLocalDate(now)}T12:00:00`);
  const sevenDayStart = new Date(end);
  sevenDayStart.setDate(sevenDayStart.getDate() - 6);

  const thirtyDayStart = new Date(end);
  thirtyDayStart.setDate(thirtyDayStart.getDate() - 29);

  const weekStart = startOfDay(end);
  const weekDay = weekStart.getDay();
  const shift = weekDay === 0 ? -6 : 1 - weekDay;
  weekStart.setDate(weekStart.getDate() + shift);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lastSevenDays = filterSummariesWithinWindow(dayMap, sevenDayStart, end);
  const lastThirtyDays = filterSummariesWithinWindow(
    dayMap,
    thirtyDayStart,
    end,
  );
  const currentWeek = filterSummariesWithinWindow(dayMap, weekStart, end);
  const currentMonth = filterSummariesWithinWindow(dayMap, monthStart, end);

  return {
    averageStartMinutes7: averageMinutes(
      lastSevenDays
        .map((summary) => summary.firstStartedAt)
        .filter(Boolean)
        .map((value) => getMinutesSinceMidnight(value as string)),
    ),
    averageStartMinutes30: averageMinutes(
      lastThirtyDays
        .map((summary) => summary.firstStartedAt)
        .filter(Boolean)
        .map((value) => getMinutesSinceMidnight(value as string)),
    ),
    averageEndMinutes7: averageMinutes(
      lastSevenDays
        .map((summary) => summary.lastEndedAt)
        .filter(Boolean)
        .map((value) => getMinutesSinceMidnight(value as string)),
    ),
    averageEndMinutes30: averageMinutes(
      lastThirtyDays
        .map((summary) => summary.lastEndedAt)
        .filter(Boolean)
        .map((value) => getMinutesSinceMidnight(value as string)),
    ),
    earliestStartMinutesThisWeek: currentWeek
      .map((summary) => summary.firstStartedAt)
      .filter(Boolean)
      .map((value) => getMinutesSinceMidnight(value as string))
      .sort((left, right) => left - right)[0] ?? null,
    tenHourDaysThisMonth: currentMonth.filter(
      (summary) => summary.totalSeconds >= 10 * 3600,
    ).length,
  };
}

export function formatFocusDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatFocusTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatClockLabel(
  value: string | null,
  fallback: string = "--:--",
): string {
  if (!value) return fallback;

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatMinutesAsClock(
  minutes: number | null,
  fallback: string = "--:--",
): string {
  if (minutes === null || Number.isNaN(minutes)) return fallback;
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

export function toLocalDateTimeInputValue(isoValue: string): string {
  const date = new Date(isoValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromLocalDateTimeInputValue(localValue: string): string {
  return new Date(localValue).toISOString();
}

function sanitizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function notifyFocusSessionsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("focusSessionsUpdated"));
}

class FocusService {
  async getActiveSession(): Promise<FocusSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch active focus session:", error);
      return null;
    }

    return data as FocusSession | null;
  }

  async startSession(note?: string): Promise<FocusSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const existing = await this.getActiveSession();
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user.id,
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_seconds: null,
        note: sanitizeNote(note),
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to start focus session:", error);
      return null;
    }

    notifyFocusSessionsUpdated();
    return data as FocusSession;
  }

  async stopSession(sessionId?: string): Promise<FocusSession | null> {
    const session = sessionId
      ? await this.getSessionById(sessionId)
      : await this.getActiveSession();

    if (!session) return null;

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(session.started_at).getTime()) /
        1000,
    );

    const { data, error } = await supabase
      .from("focus_sessions")
      .update({
        ended_at: endedAt,
        duration_seconds: Math.max(0, durationSeconds),
        is_active: false,
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to stop focus session:", error);
      return null;
    }

    notifyFocusSessionsUpdated();
    return data as FocusSession;
  }

  async getSessionById(sessionId: string): Promise<FocusSession | null> {
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Failed to fetch focus session:", error);
      return null;
    }

    return data as FocusSession;
  }

  async listSessionsForRange(
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<FocusSession[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", user.id)
      .lt("started_at", rangeEnd.toISOString())
      .order("started_at", { ascending: true });

    if (error) {
      console.error("Failed to list focus sessions:", error);
      return [];
    }

    return ((data as FocusSession[] | null) ?? []).filter((session) =>
      sessionOverlapsRange(session, rangeStart, rangeEnd),
    );
  }

  async listSessionsForDay(date: Date): Promise<FocusSession[]> {
    return this.listSessionsForRange(startOfDay(date), endOfDay(date));
  }

  async updateSession(
    sessionId: string,
    draft: FocusSessionDraft,
  ): Promise<FocusSession | null> {
    const startedAt = new Date(draft.startedAt);
    const endedAt = draft.endedAt ? new Date(draft.endedAt) : null;

    if (Number.isNaN(startedAt.getTime())) {
      throw new Error("Invalid start time");
    }

    if (endedAt && Number.isNaN(endedAt.getTime())) {
      throw new Error("Invalid end time");
    }

    if (endedAt && endedAt <= startedAt) {
      throw new Error("End time must be after start time");
    }

    const updatePayload = {
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      duration_seconds: endedAt
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
        : null,
      note: sanitizeNote(draft.note),
      is_active: !endedAt,
    };

    const { data, error } = await supabase
      .from("focus_sessions")
      .update(updatePayload)
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update focus session:", error);
      return null;
    }

    notifyFocusSessionsUpdated();
    return data as FocusSession;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from("focus_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to delete focus session:", error);
      return false;
    }

    notifyFocusSessionsUpdated();
    return true;
  }

  async getDailyHeatmapData(
    rangeStart: Date,
    rangeEnd: Date,
    now: Date = new Date(),
  ): Promise<FocusDaySummary[]> {
    const sessions = await this.listSessionsForRange(rangeStart, rangeEnd);
    const dayMap = buildFocusDayMap(sessions, now, rangeStart, rangeEnd);

    return Array.from(dayMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }

  async getTimingInsights(
    rangeStart: Date,
    rangeEnd: Date,
    now: Date = new Date(),
  ): Promise<FocusTimingInsights> {
    const sessions = await this.listSessionsForRange(rangeStart, rangeEnd);
    const dayMap = buildFocusDayMap(sessions, now, rangeStart, rangeEnd);
    return buildTimingInsights(dayMap, now);
  }
}

export const focusService = new FocusService();
