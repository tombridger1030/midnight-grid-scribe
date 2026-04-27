import { supabase } from "./supabase";

export interface DailyInputs {
  user_id: string;
  date: string;
  sleep_start_at: string | null;
  sleep_end_at: string | null;
  sleep_hours: number | null;
  sleep_sigma_7d: number | null;
  exercise: boolean | null;
  diet: boolean | null;
}

export async function getInputs(date: string): Promise<DailyInputs | null> {
  const { data, error } = await supabase
    .from("daily_inputs")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getInputsRange(
  startDate: string,
  endDate: string,
): Promise<DailyInputs[]> {
  const { data, error } = await supabase
    .from("daily_inputs")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function upsertField(
  date: string,
  patch: Partial<
    Pick<DailyInputs, "sleep_start_at" | "sleep_end_at" | "exercise" | "diet">
  >,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { error } = await supabase
    .from("daily_inputs")
    .upsert(
      { user_id: u.user.id, date, ...patch },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

/**
 * Compute sleep_start_at and sleep_end_at ISO timestamps from HH:MM strings.
 * `wakeDate` = the calendar date you woke up on (== daily_inputs.date row key).
 * If bedtime hour >= wake hour, bedtime is treated as the prior day.
 */
function computeSleepTimestamps(
  wakeDate: string,
  bedTime: string | null,
  wakeTime: string | null,
): { sleep_start_at: string | null; sleep_end_at: string | null } {
  const wakeAt = wakeTime ? new Date(`${wakeDate}T${wakeTime}:00`) : null;
  let bedAt: Date | null = null;

  if (bedTime) {
    const [bH, bM] = bedTime.split(":").map(Number);
    if (wakeAt) {
      const wH = wakeAt.getHours();
      const wM = wakeAt.getMinutes();
      const isOvernight = bH * 60 + bM >= wH * 60 + wM;
      bedAt = new Date(wakeAt);
      if (isOvernight) bedAt.setDate(bedAt.getDate() - 1);
      bedAt.setHours(bH, bM, 0, 0);
    } else {
      // No wake set yet — store as today + bedtime as a placeholder.
      // When wake is later set, the next setBedTime/setWakeTime call will rebalance.
      bedAt = new Date(`${wakeDate}T${bedTime}:00`);
    }
  }

  return {
    sleep_start_at: bedAt?.toISOString() ?? null,
    sleep_end_at: wakeAt?.toISOString() ?? null,
  };
}

/** Set bedtime, preserving (and if needed re-anchoring) the existing wake time. */
export async function setBedTime(
  date: string,
  bedTime: string | null,
): Promise<void> {
  const current = await getInputs(date);
  const wakeTime = current?.sleep_end_at
    ? formatLocalHHMM(current.sleep_end_at)
    : null;
  const ts = computeSleepTimestamps(date, bedTime, wakeTime);
  return upsertField(date, ts);
}

/** Set wake time, preserving (and if needed re-anchoring) the existing bedtime. */
export async function setWakeTime(
  date: string,
  wakeTime: string | null,
): Promise<void> {
  const current = await getInputs(date);
  const bedTime = current?.sleep_start_at
    ? formatLocalHHMM(current.sleep_start_at)
    : null;
  const ts = computeSleepTimestamps(date, bedTime, wakeTime);
  return upsertField(date, ts);
}

export async function setExercise(
  date: string,
  value: boolean | null,
): Promise<void> {
  return upsertField(date, { exercise: value });
}

export async function setDiet(
  date: string,
  value: boolean | null,
): Promise<void> {
  return upsertField(date, { diet: value });
}

/** HH:MM extracted from an ISO timestamp in local time, for editor display. */
export function formatLocalHHMM(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Compute total minutes off-target for one day's sleep window,
 * given target bedtime + wake time as HH:MM strings (local).
 * Returns |bed_offset| + |wake_offset| using shortest circular distance (mod 1440).
 * Returns null if either timestamp is missing.
 */
export function computeSleepOffsetMin(
  sleepStartIso: string | null,
  sleepEndIso: string | null,
  targetBedtime: string,
  targetWakeTime: string,
): number | null {
  if (!sleepStartIso || !sleepEndIso) return null;
  const bed = new Date(sleepStartIso);
  const wake = new Date(sleepEndIso);
  const bedMin = bed.getHours() * 60 + bed.getMinutes();
  const wakeMin = wake.getHours() * 60 + wake.getMinutes();
  const [tbH, tbM] = targetBedtime.split(":").map(Number);
  const [twH, twM] = targetWakeTime.split(":").map(Number);
  const tBed = tbH * 60 + tbM;
  const tWake = twH * 60 + twM;
  const circDist = (a: number, b: number) => {
    const d = Math.abs(a - b);
    return Math.min(d, 1440 - d);
  };
  return circDist(bedMin, tBed) + circDist(wakeMin, tWake);
}
