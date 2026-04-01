import { supabase } from "@/lib/supabase";
import { formatWeekKey, getWeekDates, getWeekKey } from "@/lib/weeklyKpi";

export const WEEKLY_LOG_OWNER_ID = "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b";
export const WEEKLY_LOG_BUCKET = "weekly-log-videos";
export const WEEKLY_LOG_DURATION_SECONDS = 60;
export const WEEKLY_LOG_STALE_MS = 2 * 60 * 1000;

export type WeeklyLogStatus = "recording" | "published" | "corrupted";
export type EffectiveWeeklyLogStatus = WeeklyLogStatus | "empty";

export interface WeeklyLogRow {
  id: string;
  owner_user_id: string;
  week_key: string;
  week_start: string;
  week_end: string;
  status: WeeklyLogStatus;
  attempt_started_at: string | null;
  recording_started_at: string | null;
  published_at: string | null;
  video_path: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyLogWindow {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface CreateWeeklyLogAttemptInput {
  ownerUserId: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
}

export interface PublishWeeklyLogInput {
  logId: string;
  ownerUserId: string;
  weekKey: string;
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

function normalizeWeeklyLogRow(row: any): WeeklyLogRow {
  return {
    id: String(row.id),
    owner_user_id: String(row.owner_user_id),
    week_key: String(row.week_key),
    week_start: String(row.week_start),
    week_end: String(row.week_end),
    status: row.status as WeeklyLogStatus,
    attempt_started_at: row.attempt_started_at ?? null,
    recording_started_at: row.recording_started_at ?? null,
    published_at: row.published_at ?? null,
    video_path: row.video_path ?? null,
    video_url: row.video_url ?? null,
    duration_seconds:
      typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function getWeeklyLogWindow(date = new Date()): WeeklyLogWindow {
  const weekKey = getWeekKey(date);
  const { start, end } = getWeekDates(weekKey);
  return {
    weekKey,
    weekStart: toISODate(start),
    weekEnd: toISODate(end),
    startDate: start,
    endDate: end,
    label: formatWeekKey(weekKey),
  };
}

export function isWeeklyLogOwner(userId?: string | null): boolean {
  return userId === WEEKLY_LOG_OWNER_ID;
}

export function isMissingWeeklyLogSchemaError(error: any): boolean {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  return (
    MISSING_TABLE_CODES.has(code) ||
    message.includes("weekly_logs") ||
    message.includes("relation") ||
    message.includes("bucket")
  );
}

export function getEffectiveWeeklyLogStatus(
  row?: WeeklyLogRow | null,
  now = Date.now(),
): EffectiveWeeklyLogStatus {
  if (!row) return "empty";
  if (
    row.status === "recording" &&
    row.attempt_started_at &&
    now - new Date(row.attempt_started_at).getTime() > WEEKLY_LOG_STALE_MS
  ) {
    return "corrupted";
  }
  return row.status;
}

export function getWeeklyLogVideoPath(
  ownerUserId: string,
  weekKey: string,
  mimeType: string,
): string {
  const extension =
    mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm";
  return `${ownerUserId}/${weekKey}/transmission.${extension}`;
}

export async function fetchWeeklyLogs(
  ownerUserId = WEEKLY_LOG_OWNER_ID,
): Promise<WeeklyLogRow[]> {
  const { data, error } = await supabase
    .from("weekly_logs")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("week_start", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeWeeklyLogRow);
}

export async function createWeeklyLogAttempt(
  input: CreateWeeklyLogAttemptInput,
): Promise<WeeklyLogRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("weekly_logs")
    .insert({
      owner_user_id: input.ownerUserId,
      week_key: input.weekKey,
      week_start: input.weekStart,
      week_end: input.weekEnd,
      status: "recording",
      attempt_started_at: now,
      recording_started_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeWeeklyLogRow(data);
}

export async function markWeeklyLogCorrupted(
  logId: string,
): Promise<WeeklyLogRow> {
  const { data, error } = await supabase
    .from("weekly_logs")
    .update({
      status: "corrupted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", logId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeWeeklyLogRow(data);
}

export async function publishWeeklyLog(
  input: PublishWeeklyLogInput,
): Promise<WeeklyLogRow> {
  const videoPath = getWeeklyLogVideoPath(
    input.ownerUserId,
    input.weekKey,
    input.mimeType,
  );

  const uploadResult = await supabase.storage
    .from(WEEKLY_LOG_BUCKET)
    .upload(videoPath, input.blob, {
      upsert: false,
      contentType: input.mimeType,
      cacheControl: "3600",
    });

  if (uploadResult.error) throw uploadResult.error;

  const publicUrl = supabase.storage
    .from(WEEKLY_LOG_BUCKET)
    .getPublicUrl(videoPath).data.publicUrl;

  const { data, error } = await supabase
    .from("weekly_logs")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      duration_seconds: input.durationSeconds,
      video_path: videoPath,
      video_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.logId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeWeeklyLogRow(data);
}

export async function repairStaleWeeklyLog(
  row: WeeklyLogRow,
): Promise<WeeklyLogRow | null> {
  if (getEffectiveWeeklyLogStatus(row) !== "corrupted") {
    return null;
  }

  if (row.status !== "recording") {
    return null;
  }

  return markWeeklyLogCorrupted(row.id);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
