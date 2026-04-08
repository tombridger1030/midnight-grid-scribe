import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import {
  buildFocusDayMap,
  buildTimingInsights,
  focusService,
  formatFocusDuration,
  formatFocusTimer,
  splitSessionByDay,
  type FocusSession,
} from "@/lib/focusService";

function makeSession(
  id: string,
  startedAt: string,
  endedAt: string | null,
  isActive: boolean = false,
): FocusSession {
  const durationSeconds = endedAt
    ? Math.floor(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      )
    : null;

  return {
    id,
    user_id: "user-1",
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    note: null,
    is_active: isActive,
    created_at: startedAt,
    updated_at: endedAt ?? startedAt,
  };
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

describe("focusService helpers", () => {
  it("splits a session across midnight boundaries", () => {
    const session = makeSession(
      "cross-midnight",
      "2026-04-07T23:15:00",
      "2026-04-08T02:45:00",
    );

    const segments = splitSessionByDay(session);

    expect(segments).toHaveLength(2);
    expect(segments[0].date).toBe("2026-04-07");
    expect(segments[0].seconds).toBe(45 * 60);
    expect(segments[1].date).toBe("2026-04-08");
    expect(segments[1].seconds).toBe(2 * 3600 + 45 * 60);
  });

  it("includes live active session time in the current day summary", () => {
    const activeSession = makeSession(
      "active",
      "2026-04-08T08:00:00",
      null,
      true,
    );
    const now = new Date("2026-04-08T10:30:00");

    const map = buildFocusDayMap([activeSession], now);
    const summary = map.get("2026-04-08");

    expect(summary?.totalSeconds).toBe(2 * 3600 + 30 * 60);
    expect(summary?.firstStartedAt).toBe(toIso("2026-04-08T08:00:00"));
    expect(summary?.lastEndedAt).toBe(toIso("2026-04-08T10:30:00"));
  });

  it("aggregates multiple sessions within the same day", () => {
    const sessions = [
      makeSession(
        "morning",
        "2026-04-08T07:00:00",
        "2026-04-08T10:00:00",
      ),
      makeSession(
        "afternoon",
        "2026-04-08T12:30:00",
        "2026-04-08T18:00:00",
      ),
    ];

    const map = buildFocusDayMap(sessions);
    const summary = map.get("2026-04-08");

    expect(summary?.totalSeconds).toBe(8 * 3600 + 30 * 60);
    expect(summary?.sessions).toHaveLength(2);
    expect(summary?.firstStartedAt).toBe(toIso("2026-04-08T07:00:00"));
    expect(summary?.lastEndedAt).toBe(toIso("2026-04-08T18:00:00"));
  });

  it("builds timing insights for recent days", () => {
    const sessions = [
      makeSession(
        "day1",
        "2026-04-02T07:00:00",
        "2026-04-02T17:30:00",
      ),
      makeSession(
        "day2",
        "2026-04-03T08:00:00",
        "2026-04-03T18:00:00",
      ),
      makeSession(
        "day3",
        "2026-04-04T06:30:00",
        "2026-04-04T16:00:00",
      ),
      makeSession(
        "day4",
        "2026-04-05T07:30:00",
        "2026-04-05T20:00:00",
      ),
    ];
    const now = new Date("2026-04-08T12:00:00");

    const dayMap = buildFocusDayMap(sessions, now);
    const insights = buildTimingInsights(dayMap, now);

    expect(insights.averageStartMinutes7).toBe(435);
    expect(insights.averageEndMinutes7).toBe(1073);
    expect(insights.earliestStartMinutesThisWeek).toBeNull();
    expect(insights.tenHourDaysThisMonth).toBe(3);
  });

  it("formats duration and timer strings cleanly", () => {
    expect(formatFocusDuration(59 * 60)).toBe("59m");
    expect(formatFocusDuration(3 * 3600 + 5 * 60)).toBe("3h 05m");
    expect(formatFocusTimer(3 * 3600 + 5 * 60 + 9)).toBe("03:05:09");
  });

  it("prevents reopening a finished session while another session is active", async () => {
    const closedSession = makeSession(
      "closed-session",
      "2026-04-08T07:00:00",
      "2026-04-08T09:00:00",
    );
    const activeSession = makeSession(
      "active-session",
      "2026-04-08T10:00:00",
      null,
      true,
    );

    vi.spyOn(focusService, "getSessionById").mockResolvedValueOnce(closedSession);
    vi.spyOn(focusService, "getActiveSession").mockResolvedValueOnce(activeSession);

    await expect(
      focusService.updateSession(closedSession.id, {
        startedAt: closedSession.started_at,
        endedAt: null,
        note: null,
      }),
    ).rejects.toThrow(
      "Stop the current active session before reopening another one",
    );
  });
});
