import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Camera,
  Loader2,
  Lock,
  Orbit,
  Radio,
  SatelliteDish,
  ShieldAlert,
  Video,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  WEEKLY_LOG_DURATION_SECONDS,
  WeeklyLogRow,
  createWeeklyLogAttempt,
  fetchWeeklyLogs,
  getEffectiveWeeklyLogStatus,
  getWeeklyLogWindow,
  isMissingWeeklyLogSchemaError,
  isWeeklyLogOwner,
  markWeeklyLogCorrupted,
  publishWeeklyLog,
  repairStaleWeeklyLog,
  toISODate,
} from "@/lib/weeklyLog";
import { getWeekKey } from "@/lib/weeklyKpi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const QUERY_KEY = ["weekly-log-feed"];
const MISSION_EPOCH = new Date("2026-03-01T00:00:00.000Z");

type PermissionState =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported";

function formatTelemetryTime(value?: string | null): string {
  if (!value) return "No transmission";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return `${startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${endDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function getSolLabel(date = new Date()): number {
  const diffMs = date.getTime() - MISSION_EPOCH.getTime();
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

function getStatusPalette(status: ReturnType<typeof getEffectiveWeeklyLogStatus>) {
  switch (status) {
    case "published":
      return {
        badge: "bg-emerald-300/14 text-emerald-100 border-emerald-200/20",
        label: "TRANSMITTED",
      };
    case "corrupted":
      return {
        badge: "bg-rose-300/14 text-rose-100 border-rose-200/20",
        label: "CORRUPTED",
      };
    case "recording":
      return {
        badge: "bg-amber-300/16 text-amber-50 border-amber-200/20",
        label: "IN PROGRESS",
      };
    default:
      return {
        badge: "bg-white/8 text-stone-100 border-white/10",
        label: "NO POST",
      };
  }
}

function getRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  const preferred = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];

  return (
    preferred.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    null
  );
}

function buildArchive(
  rows: WeeklyLogRow[],
  currentWeekKey: string,
  currentWeekStart: string,
) {
  if (rows.length === 0) return [];

  const byWeek = new Map(rows.map((row) => [row.week_key, row]));
  const earliest = rows.reduce((best, row) => {
    const current = new Date(`${row.week_start}T00:00:00`);
    return current < best ? current : best;
  }, new Date(`${rows[0].week_start}T00:00:00`));

  const cursor = new Date(`${currentWeekStart}T00:00:00`);
  cursor.setDate(cursor.getDate() - 7);

  const archive: Array<{
    weekKey: string;
    weekStart: string;
    weekEnd: string;
    row?: WeeklyLogRow;
  }> = [];

  while (cursor >= earliest) {
    const weekKey = getWeekKey(cursor);
    if (weekKey !== currentWeekKey) {
      const row = byWeek.get(weekKey);
      const weekStart = row?.week_start ?? toISODate(cursor);
      const endDate = new Date(cursor);
      endDate.setDate(endDate.getDate() + 6);

      archive.push({
        weekKey,
        weekStart,
        weekEnd: row?.week_end ?? toISODate(endDate),
        row,
      });
    }

    cursor.setDate(cursor.getDate() - 7);
  }

  return archive;
}

const WeeklyLog = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const location = useLocation();
  const currentWeek = useMemo(() => getWeeklyLogWindow(), []);
  const ownerCanPost = isWeeklyLogOwner(user?.id);
  const loginRedirectTarget = `${location.pathname}${location.search}${location.hash}`;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<
    "idle" | "preview" | "starting" | "recording" | "finalizing"
  >("idle");
  const [secondsRemaining, setSecondsRemaining] = useState(
    WEEKLY_LOG_DURATION_SECONDS,
  );

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("video/webm");

  const weeklyLogsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchWeeklyLogs(),
    refetchInterval: 30_000,
  });

  const createAttemptMutation = useMutation({
    mutationFn: createWeeklyLogAttempt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishWeeklyLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const corruptMutation = useMutation({
    mutationFn: markWeeklyLogCorrupted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const rows = weeklyLogsQuery.data ?? [];
  const currentRow = rows.find((row) => row.week_key === currentWeek.weekKey);
  const currentStatus = getEffectiveWeeklyLogStatus(currentRow);
  const archive = useMemo(
    () => buildArchive(rows, currentWeek.weekKey, currentWeek.weekStart),
    [rows, currentWeek.weekKey, currentWeek.weekStart],
  );

  const schemaMissing =
    weeklyLogsQuery.error && isMissingWeeklyLogSchemaError(weeklyLogsQuery.error);
  const canStartTransmission =
    ownerCanPost && currentStatus === "empty" && !schemaMissing;
  const statusPalette = getStatusPalette(currentStatus);

  useEffect(() => {
    if (!ownerCanPost || !currentRow) return;
    if (currentRow.status !== "recording") return;
    if (getEffectiveWeeklyLogStatus(currentRow) !== "corrupted") return;

    void repairStaleWeeklyLog(currentRow).then((repaired) => {
      if (repaired) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    });
  }, [currentRow, ownerCanPost, queryClient]);

  useEffect(() => {
    if (!dialogOpen) {
      if (recordingState === "preview" || recordingState === "idle") {
        stopPreviewStream();
      }
      return;
    }
  }, [dialogOpen, recordingState]);

  useEffect(() => {
    if (!dialogOpen || permissionState !== "ready" || !streamRef.current) {
      return;
    }

    attachPreviewStream();
  }, [dialogOpen, permissionState]);

  useEffect(() => {
    if (recordingState !== "recording" && recordingState !== "finalizing") {
      return;
    }

    const interruptAttempt = () => {
      const attemptId = attemptIdRef.current;
      if (attemptId) {
        void corruptMutation.mutateAsync(attemptId).catch(() => undefined);
      }
    };

    window.addEventListener("beforeunload", interruptAttempt);
    window.addEventListener("pagehide", interruptAttempt);
    return () => {
      window.removeEventListener("beforeunload", interruptAttempt);
      window.removeEventListener("pagehide", interruptAttempt);
    };
  }, [corruptMutation, recordingState]);

  function clearRecordingTimers() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopPreviewStream(options?: {
    clearChunks?: boolean;
    resetRecorderState?: boolean;
    resetPermissionState?: boolean;
  }) {
    const {
      clearChunks = true,
      resetRecorderState = true,
      resetPermissionState = true,
    } = options ?? {};

    clearRecordingTimers();
    recorderRef.current = null;
    if (clearChunks) {
      chunksRef.current = [];
    }
    recordingStartedAtRef.current = null;
    setSecondsRemaining(WEEKLY_LOG_DURATION_SECONDS);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }

    if (resetRecorderState) {
      setRecordingState("idle");
    }

    if (
      resetPermissionState &&
      permissionState !== "unsupported" &&
      permissionState !== "denied"
    ) {
      setPermissionState("idle");
    }
  }

  function attachPreviewStream() {
    if (!previewRef.current || !streamRef.current) {
      return;
    }

    previewRef.current.srcObject = streamRef.current;
    void previewRef.current.play().catch((error) => {
      console.warn("Weekly log preview playback did not auto-start", error);
    });
  }

  async function openPreview() {
    if (permissionState === "requesting" || permissionState === "ready") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setPermissionState("unsupported");
      setSurfaceError(
        "This browser cannot record a weekly transmission. Use a browser with camera and microphone support.",
      );
      return;
    }

    setPermissionState("requesting");
    setSurfaceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;
      setPermissionState("ready");
      setRecordingState("preview");
      attachPreviewStream();
    } catch (error) {
      console.error("Failed to open weekly log preview", error);
      setPermissionState("denied");
      setSurfaceError(
        "Camera or microphone access was denied. Permission is required before your weekly attempt can begin.",
      );
    }
  }

  async function handleDialogChange(nextOpen: boolean) {
    if (!nextOpen && (recordingState === "recording" || recordingState === "finalizing")) {
      return;
    }
    setDialogOpen(nextOpen);
  }

  async function markAttemptCorrupted(attemptId: string) {
    try {
      await corruptMutation.mutateAsync(attemptId);
    } catch (error) {
      console.error("Failed to mark weekly log corrupted", error);
    }
  }

  async function handleBeginTransmission() {
    if (!ownerCanPost || !user) {
      setSurfaceError("You must be signed in as the owner to transmit.");
      return;
    }

    if (!streamRef.current) {
      setSurfaceError(
        "Camera preview is not ready yet. Grant camera and microphone access first.",
      );
      return;
    }

    const mimeType = getRecorderMimeType();
    if (!mimeType) {
      setSurfaceError(
        "This browser cannot encode the mission log video format required for publishing.",
      );
      return;
    }

    setSurfaceError(null);
    setRecordingState("starting");

    let attempt: WeeklyLogRow;
    try {
      attempt = await createAttemptMutation.mutateAsync({
        ownerUserId: user.id,
        weekKey: currentWeek.weekKey,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
      });
    } catch (error: any) {
      console.error("Failed to create weekly log attempt", error);
      setRecordingState("preview");
      setSurfaceError(
        isMissingWeeklyLogSchemaError(error)
          ? "The weekly log database schema is not available yet. Run the Supabase migration before recording."
          : error?.message ?? "Could not lock this week's attempt.",
      );
      return;
    }

    attemptIdRef.current = attempt.id;
    mimeTypeRef.current = mimeType;

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordingStartedAtRef.current = null;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = async (event) => {
        console.error("Weekly log recorder error", event);
        setSurfaceError("Transmission recorder failed. This attempt is now corrupted.");
        const currentAttemptId = attemptIdRef.current;
        if (currentAttemptId) {
          await markAttemptCorrupted(currentAttemptId);
        }
        setDialogOpen(false);
        stopPreviewStream();
      };

      recorder.onstop = async () => {
        clearRecordingTimers();
        const currentAttemptId = attemptIdRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const durationSeconds = recordingStartedAtRef.current
          ? Math.min(
              WEEKLY_LOG_DURATION_SECONDS,
              Math.max(
                1,
                Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
              ),
            )
          : WEEKLY_LOG_DURATION_SECONDS;

        stopPreviewStream({
          clearChunks: false,
          resetRecorderState: false,
          resetPermissionState: false,
        });

        if (!currentAttemptId) {
          return;
        }

        if (blob.size === 0) {
          setSurfaceError("No video payload was captured. This attempt is now corrupted.");
          await markAttemptCorrupted(currentAttemptId);
          attemptIdRef.current = null;
          chunksRef.current = [];
          setRecordingState("idle");
          setDialogOpen(false);
          return;
        }

        setRecordingState("finalizing");
        try {
          await publishMutation.mutateAsync({
            logId: currentAttemptId,
            ownerUserId: user.id,
            weekKey: currentWeek.weekKey,
            blob,
            mimeType: mimeTypeRef.current,
            durationSeconds,
          });
          setDialogOpen(false);
        } catch (error) {
          console.error("Failed to publish weekly transmission", error);
          setSurfaceError(
            "Video upload failed after the attempt was consumed. The transmission has been marked corrupted.",
          );
          await markAttemptCorrupted(currentAttemptId);
        } finally {
          attemptIdRef.current = null;
          chunksRef.current = [];
          setRecordingState("idle");
        }
      };

      recorder.start(500);
      setRecordingState("recording");
      setSecondsRemaining(WEEKLY_LOG_DURATION_SECONDS);

      const startedAt = Date.now();
      recordingStartedAtRef.current = startedAt;
      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setSecondsRemaining(
          Math.max(WEEKLY_LOG_DURATION_SECONDS - elapsed, 0),
        );
      }, 200);

      timeoutRef.current = window.setTimeout(() => {
        setRecordingState("finalizing");
        setSecondsRemaining(0);
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, WEEKLY_LOG_DURATION_SECONDS * 1000);
    } catch (error) {
      console.error("Failed to start weekly transmission", error);
      setSurfaceError("Recorder initialization failed. This attempt is now corrupted.");
      await markAttemptCorrupted(attempt.id);
      setRecordingState("idle");
      setDialogOpen(false);
      stopPreviewStream();
    }
  }

  function handleEndTransmission() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    setRecordingState("finalizing");
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    recorder.stop();
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0d0908] text-stone-100">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(247,178,123,0.18),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(255,255,255,0.09),_transparent_18%),linear-gradient(180deg,_rgba(21,15,13,0.88)_0%,_rgba(10,7,6,1)_100%)]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:120px_120px]" />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#f5c49f]/12 to-transparent" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge className="w-fit border-white/15 bg-white/8 px-3 py-1 font-mono text-[11px] tracking-[0.25em] text-stone-200">
                PUBLIC WEEKLY TRANSMISSION
              </Badge>
              <div className="space-y-2">
                <h1 className="font-display text-4xl uppercase tracking-[0.08em] text-stone-50 sm:text-5xl">
                  Martian Log
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-stone-300/80 sm:text-base">
                  A single weekly transmission from the habitat. One attempt. Sixty
                  seconds. If no transmission goes out, the week remains silent.
                </p>
              </div>
            </div>

            <Card className="border-white/12 bg-white/6 backdrop-blur-xl lg:max-w-sm">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Current Window
                    </p>
                    <p className="mt-1 text-sm text-stone-100">
                      {formatDateRange(currentWeek.weekStart, currentWeek.weekEnd)}
                    </p>
                  </div>
                  <Badge className={cn("border px-3 py-1 font-mono text-[11px] tracking-[0.22em]", statusPalette.badge)}>
                    {statusPalette.label}
                  </Badge>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-3 gap-4 text-left">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Sol
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-stone-50">
                      {getSolLabel()}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Time Cap
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-stone-50">60s</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Access
                    </p>
                    <p className="mt-1 text-sm font-medium text-stone-200">
                      Public Read
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {surfaceError && (
            <Alert className="border-rose-300/20 bg-rose-500/10 text-rose-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Transmission Warning</AlertTitle>
              <AlertDescription>{surfaceError}</AlertDescription>
            </Alert>
          )}

          {schemaMissing && (
            <Alert className="border-amber-300/20 bg-amber-500/10 text-amber-50">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Database Schema Required</AlertTitle>
              <AlertDescription>
                The weekly log table or storage bucket is not available yet. Run
                the `supabase/migrations/062_weekly_logs.sql` migration before
                using this page.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="order-2 grid gap-6 xl:order-1">
              <Card className="border-white/12 bg-white/6 backdrop-blur-xl">
                <CardHeader className="pb-4">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                    Habitat Telemetry
                  </CardDescription>
                  <CardTitle className="font-display text-2xl uppercase tracking-[0.08em] text-stone-50">
                    Mission Week {currentWeek.weekKey.replace("W", "")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Transmission Window
                    </p>
                    <p className="text-sm text-stone-100">
                      {formatDateRange(currentWeek.weekStart, currentWeek.weekEnd)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Last Activity
                    </p>
                    <p className="text-sm text-stone-100">
                      {formatTelemetryTime(
                        currentRow?.published_at ?? currentRow?.attempt_started_at,
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Archive Visibility
                    </p>
                    <p className="text-sm text-stone-100">
                      Published and corrupted weeks remain public. Silent weeks are
                      shown explicitly in the archive.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/12 bg-white/6 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                    Transmission Control
                  </CardDescription>
                  <CardTitle className="font-display text-xl uppercase tracking-[0.08em] text-stone-50">
                    Owner Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ownerCanPost ? (
                    <>
                      <p className="text-sm leading-6 text-stone-300/80">
                        This account can consume the weekly attempt from directly
                        inside the public page.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={() => setDialogOpen(true)}
                          disabled={!canStartTransmission}
                          className="border border-white/10 bg-[#f1b081] text-stone-950 hover:bg-[#f4bf99]"
                        >
                          <Camera className="h-4 w-4" />
                          Begin Transmission
                        </Button>
                        {!canStartTransmission && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="border-white/10 bg-white/8 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-stone-200">
                                <Lock className="mr-1.5 h-3.5 w-3.5" />
                                Locked
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border-white/10 bg-stone-950 text-stone-100">
                              {currentStatus === "empty"
                                ? "Run the migration before using the recorder."
                                : "This week already has its single attempt recorded or consumed."}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm leading-6 text-stone-300/80">
                        Posting stays locked to the owner account. Everyone else can
                        read the weekly log publicly.
                      </p>
                      {!user ? (
                        <Button
                          asChild
                          variant="outline"
                          className="border-white/12 bg-white/5 text-stone-100 hover:bg-white/10"
                        >
                          <Link
                            to={`/?redirectTo=${encodeURIComponent(loginRedirectTarget)}`}
                          >
                            Sign In To Transmit
                          </Link>
                        </Button>
                      ) : profile?.is_admin ? (
                        <Badge className="w-fit border-white/10 bg-white/8 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-stone-200">
                          Admin access does not override the owner lock
                        </Badge>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="order-1 overflow-hidden border-white/12 bg-white/6 backdrop-blur-2xl xl:order-2">
              <CardHeader className="space-y-3 border-b border-white/10 pb-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <CardDescription className="font-mono text-[11px] uppercase tracking-[0.26em] text-stone-400">
                      Featured Transmission
                    </CardDescription>
                    <CardTitle className="font-display text-3xl uppercase tracking-[0.08em] text-stone-50">
                      {currentWeek.label}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={cn("border px-3 py-1 font-mono text-[11px] tracking-[0.22em]", statusPalette.badge)}>
                      <Radio className="mr-1.5 h-3.5 w-3.5" />
                      {statusPalette.label}
                    </Badge>
                    <Badge className="border-white/10 bg-white/8 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-stone-200">
                      SOL {getSolLabel()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-2xl border border-white/10 bg-[#120d0b]">
                    {weeklyLogsQuery.isLoading ? (
                      <Skeleton className="h-full w-full rounded-none bg-white/10" />
                    ) : currentStatus === "published" && currentRow?.video_url ? (
                      <video
                        className="h-full w-full object-cover"
                        controls
                        playsInline
                        preload="metadata"
                        src={currentRow.video_url}
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-end bg-[radial-gradient(circle_at_50%_0%,rgba(247,176,129,0.3),transparent_36%),linear-gradient(180deg,rgba(49,32,23,0.55),rgba(10,8,7,0.95))] p-6">
                        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_16px]" />
                        <div className="relative space-y-2">
                          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-stone-300/80">
                            {currentStatus === "corrupted"
                              ? "Signal integrity lost"
                              : "No transmission captured"}
                          </p>
                          <h2 className="font-display text-3xl uppercase tracking-[0.08em] text-stone-50 sm:text-4xl">
                            {currentStatus === "corrupted"
                              ? "Transmission Corrupted"
                              : "No Post This Week"}
                          </h2>
                          <p className="max-w-lg text-sm leading-6 text-stone-200/80">
                            {currentStatus === "corrupted"
                              ? "A weekly attempt began but never reached a publishable sixty-second transmission."
                              : "This habitat missed its weekly dispatch. The archive records the silence instead of hiding it."}
                          </p>
                        </div>
                      </div>
                    )}
                  </AspectRatio>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/12 bg-white/6 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                Reverse Archive
              </CardDescription>
              <CardTitle className="font-display text-3xl uppercase tracking-[0.08em] text-stone-50">
                Weekly History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyLogsQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-44 rounded-2xl bg-white/10" />
                  ))}
                </div>
              ) : archive.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                    Archive Pending
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stone-300/80">
                    Once more weeks accumulate, this archive will show every slot,
                    including any missed transmissions.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[32rem] pr-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {archive.map((entry) => {
                      const status = getEffectiveWeeklyLogStatus(entry.row);
                      const palette = getStatusPalette(status);
                      return (
                        <Card
                          key={entry.weekKey}
                          className="overflow-hidden border-white/10 bg-black/15"
                        >
                          <AspectRatio
                            ratio={16 / 9}
                            className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(242,182,129,0.2),_transparent_34%),linear-gradient(180deg,rgba(38,27,22,0.72),rgba(13,10,9,0.96))]"
                          >
                            <div className="flex h-full flex-col justify-between p-4">
                              <div className="flex items-start justify-between gap-4">
                                <Badge className={cn("border px-3 py-1 font-mono text-[10px] tracking-[0.22em]", palette.badge)}>
                                  {palette.label}
                                </Badge>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-300/75">
                                  {entry.weekKey}
                                </p>
                              </div>
                              <div>
                                <p className="font-display text-2xl uppercase tracking-[0.08em] text-stone-50">
                                  {status === "published"
                                    ? "Transmission Logged"
                                    : status === "corrupted"
                                      ? "Failed Dispatch"
                                      : "No Post This Week"}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-stone-200/80">
                                  {status === "published"
                                    ? "A full weekly transmission was captured and published."
                                    : status === "corrupted"
                                      ? "An attempt started but the signal never resolved cleanly."
                                      : "No attempt was made during this mission window."}
                                </p>
                              </div>
                            </div>
                          </AspectRatio>
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-4 text-xs text-stone-400">
                              <span className="font-mono uppercase tracking-[0.22em]">
                                Window
                              </span>
                              <span>{formatDateRange(entry.weekStart, entry.weekEnd)}</span>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex items-center justify-between gap-4 text-xs text-stone-400">
                              <span className="font-mono uppercase tracking-[0.22em]">
                                Timestamp
                              </span>
                              <span>
                                {formatTelemetryTime(
                                  entry.row?.published_at ??
                                    entry.row?.attempt_started_at ??
                                    null,
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-5xl border-white/10 bg-[#120d0b]/95 p-0 text-stone-100 backdrop-blur-2xl">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative min-h-[24rem] border-b border-white/10 lg:border-b-0 lg:border-r">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(247,178,123,0.15),_transparent_28%),linear-gradient(180deg,rgba(28,20,17,0.65),rgba(14,10,9,0.98))]" />
                <div className="relative flex h-full flex-col gap-4 p-6">
                  <DialogHeader className="text-left">
                    <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                      Recorder
                    </DialogDescription>
                    <DialogTitle className="font-display text-3xl uppercase tracking-[0.08em] text-stone-50">
                      Weekly Transmission Capture
                    </DialogTitle>
                  </DialogHeader>

                  <AspectRatio
                    ratio={16 / 9}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-black/25"
                  >
                    {permissionState === "requesting" ? (
                      <div className="flex h-full items-center justify-center gap-3 text-stone-200">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Requesting camera and microphone access
                      </div>
                    ) : permissionState === "ready" ? (
                      <video
                        ref={previewRef}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-stone-300/80">
                        <p>
                          {permissionState === "unsupported"
                            ? "This browser cannot record video from the page."
                            : permissionState === "denied"
                              ? "Camera access was denied or blocked. Allow camera and microphone access, then try again."
                              : "Enable the camera preview before the attempt begins."}
                        </p>
                        {permissionState !== "unsupported" && (
                          <Button
                            type="button"
                            onClick={() => void openPreview()}
                            disabled={!ownerCanPost || !canStartTransmission}
                            className="border border-white/10 bg-[#f1b081] text-stone-950 hover:bg-[#f4bf99]"
                          >
                            <Camera className="h-4 w-4" />
                            {permissionState === "denied"
                              ? "Retry Camera Access"
                              : "Enable Camera Preview"}
                          </Button>
                        )}
                      </div>
                    )}
                  </AspectRatio>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400">
                        Countdown
                      </p>
                      <p className="font-display text-2xl uppercase tracking-[0.08em] text-stone-50">
                        {secondsRemaining}s
                      </p>
                    </div>
                    <Progress
                      value={
                        ((WEEKLY_LOG_DURATION_SECONDS - secondsRemaining) /
                          WEEKLY_LOG_DURATION_SECONDS) *
                        100
                      }
                      className="h-2 bg-white/10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 p-6">
                <div className="space-y-4">
                  <Badge className="w-fit border-white/10 bg-white/8 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-stone-200">
                    <SatelliteDish className="mr-1.5 h-3.5 w-3.5" />
                    ONE ATTEMPT THIS WEEK
                  </Badge>
                  <p className="text-sm leading-6 text-stone-300/85">
                    Pressing begin consumes the week. The recorder can run for up
                    to sixty seconds and publishes whatever was captured when you
                    end it or the timer expires.
                  </p>
                </div>

                <Card className="border-white/10 bg-black/15">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start gap-3">
                      <Orbit className="mt-0.5 h-4 w-4 text-stone-300" />
                      <p className="text-sm leading-6 text-stone-300/80">
                        Week: {currentWeek.weekKey} ({currentWeek.label})
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Video className="mt-0.5 h-4 w-4 text-stone-300" />
                      <p className="text-sm leading-6 text-stone-300/80">
                        Keep the browser focused until the upload finishes. Closing
                        the tab corrupts the week.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {surfaceError && (
                  <Alert className="border-rose-300/20 bg-rose-500/10 text-rose-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Recorder Error</AlertTitle>
                    <AlertDescription>{surfaceError}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-auto flex flex-col gap-3">
                  <Button
                    onClick={
                      recordingState === "recording"
                        ? handleEndTransmission
                        : handleBeginTransmission
                    }
                    disabled={
                      recordingState === "starting" ||
                      recordingState === "finalizing" ||
                      (recordingState !== "recording" &&
                        permissionState !== "ready")
                    }
                    className={cn(
                      "h-12 border border-white/10 text-base font-semibold",
                      recordingState === "recording"
                        ? "bg-rose-400 text-rose-950 hover:bg-rose-300"
                        : "bg-[#f1b081] text-stone-950 hover:bg-[#f4bf99]",
                    )}
                  >
                    {recordingState === "starting" ||
                    recordingState === "finalizing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : recordingState === "recording" ? (
                      <Radio className="h-4 w-4" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {recordingState === "recording"
                      ? "End And Publish"
                      : recordingState === "finalizing"
                        ? "Uploading Transmission"
                        : "Begin Transmission"}
                  </Button>
                  <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    Closing is disabled once the attempt begins
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default WeeklyLog;
