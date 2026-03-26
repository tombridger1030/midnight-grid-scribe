// Whoop Sync Edge Function
// Fetches recovery, sleep, and strain data from Whoop API v2 and upserts to mission_control_health.
// Handles token refresh via OAuth2 refresh_token grant.
// Designed to run on a cron schedule.

import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  getMissionControlUserId,
  jsonResponse,
} from "../_shared/utils.ts";

const WHOOP_API = "https://api.prod.whoop.com";
const WHOOP_TOKEN_URL = `${WHOOP_API}/oauth/oauth2/token`;
const MAX_SYNC_ERRORS = 10;

interface WhoopRecoveryResponse {
  records?: Array<{
    score?: {
      recovery_score?: number;
      hrv_rmssd_milli?: number;
      resting_heart_rate?: number;
    };
  }>;
}

interface WhoopSleepResponse {
  records?: Array<{
    score?: {
      total_in_bed_time_milli?: number;
      sleep_efficiency_percentage?: number;
    };
  }>;
}

interface WhoopCycleResponse {
  records?: Array<{
    id?: number;
    score?: {
      strain?: number;
      kilojoule?: number;
    };
  }>;
}

/** Get today's date as YYYY-MM-DD in UTC. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Append an error entry, capping at MAX_SYNC_ERRORS. */
function appendSyncError(existing: unknown[], message: string): unknown[] {
  const entry = { message, at: new Date().toISOString() };
  const errors = [...existing, entry];
  return errors.slice(-MAX_SYNC_ERRORS);
}

/** Fetch from the Whoop API with bearer auth. Returns null on failure. */
async function whoopFetch<T>(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "noctisium-whoop-sync",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Whoop API error: status ${res.status}`);
      return { ok: false, status: res.status, data: null };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (err) {
    console.error(
      "Whoop fetch error:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, status: 0, data: null };
  }
}

/** Refresh the Whoop access token using the refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<{
  ok: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  status?: number;
}> {
  const clientId = Deno.env.get("WHOOP_CLIENT_ID");
  const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET not set");
    return { ok: false };
  }

  try {
    const res = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Token refresh failed: status ${res.status}`);
      return { ok: false, status: res.status };
    }

    const data = await res.json();
    const expiresInSeconds = data.expires_in ?? 3600;
    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    return {
      ok: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt,
    };
  } catch (err) {
    console.error(
      "Token refresh error:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false };
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const supabase = createServiceClient();

  try {
    const userId = getMissionControlUserId();

    // 1. Check if Whoop is connected and get tokens from sync table
    const { data: syncRow, error: syncError } = await supabase
      .from("mission_control_sync")
      .select(
        "whoop_connected, whoop_access_token, whoop_refresh_token, whoop_token_expires_at, last_whoop_sync, whoop_sync_errors",
      )
      .eq("user_id", userId)
      .single();

    if (syncError || !syncRow) {
      return errorResponse("Sync config not found", 404);
    }

    if (!syncRow.whoop_connected || !syncRow.whoop_access_token) {
      return jsonResponse({ message: "Whoop not connected" });
    }

    let syncErrors: unknown[] = syncRow.whoop_sync_errors ?? [];
    let accessToken: string = syncRow.whoop_access_token;
    const refreshToken: string | null = syncRow.whoop_refresh_token;

    if (!accessToken && !refreshToken) {
      // No tokens at all -- disconnect
      await supabase
        .from("mission_control_sync")
        .update({ whoop_connected: false })
        .eq("user_id", userId);
      return errorResponse("No Whoop tokens found", 401);
    }

    // Check if token is expired or missing
    const tokenExpired =
      !accessToken ||
      (syncRow.whoop_token_expires_at &&
        new Date(syncRow.whoop_token_expires_at) <= new Date());

    if (tokenExpired && refreshToken) {
      const refresh = await refreshAccessToken(refreshToken);

      if (!refresh.ok) {
        // 401 from token endpoint means refresh token is revoked/invalid
        if (refresh.status === 401) {
          await supabase
            .from("mission_control_sync")
            .update({
              whoop_connected: false,
              whoop_access_token: null,
              whoop_refresh_token: null,
              whoop_sync_errors: appendSyncError(
                syncErrors,
                "Refresh token rejected (401). Whoop disconnected.",
              ),
            })
            .eq("user_id", userId);

          return errorResponse(
            "Whoop refresh token invalid. Disconnected.",
            401,
          );
        }

        syncErrors = appendSyncError(syncErrors, "Token refresh failed");
        // If we still have an access token, try it anyway
        if (!accessToken) {
          await supabase
            .from("mission_control_sync")
            .update({ whoop_sync_errors: syncErrors })
            .eq("user_id", userId);
          return errorResponse("Token refresh failed and no access token", 401);
        }
      } else {
        // Refresh succeeded -- store new tokens in sync table
        accessToken = refresh.accessToken!;

        await supabase
          .from("mission_control_sync")
          .update({
            whoop_access_token: refresh.accessToken!,
            whoop_refresh_token: refresh.refreshToken ?? refreshToken,
            whoop_token_expires_at: refresh.expiresAt,
          })
          .eq("user_id", userId);
      }
    }

    if (!accessToken) {
      return errorResponse("No valid access token available", 401);
    }

    // 3. Fetch data from Whoop API v2 (all three endpoints in parallel)
    const [recoveryRes, sleepRes, cycleRes] = await Promise.all([
      whoopFetch<WhoopRecoveryResponse>(
        `${WHOOP_API}/developer/v2/recovery?limit=1`,
        accessToken,
      ),
      whoopFetch<WhoopSleepResponse>(
        `${WHOOP_API}/developer/v2/activity/sleep?limit=1`,
        accessToken,
      ),
      whoopFetch<WhoopCycleResponse>(
        `${WHOOP_API}/developer/v2/cycle?limit=1`,
        accessToken,
      ),
    ]);

    // If ALL endpoints return 401, token is dead
    if (
      recoveryRes.status === 401 &&
      sleepRes.status === 401 &&
      cycleRes.status === 401
    ) {
      syncErrors = appendSyncError(
        syncErrors,
        "All Whoop endpoints returned 401. Token may be invalid.",
      );
      await supabase
        .from("mission_control_sync")
        .update({ whoop_sync_errors: syncErrors })
        .eq("user_id", userId);
      return errorResponse("Whoop API rejected token (401)", 401);
    }

    // 4. Extract data, handling partial/null responses gracefully
    let recoveryScore: number | null = null;
    let hrvMs: number | null = null;
    let restingHr: number | null = null;

    if (recoveryRes.ok && recoveryRes.data?.records?.[0]?.score) {
      const score = recoveryRes.data.records[0].score;
      recoveryScore = score.recovery_score ?? null;
      hrvMs = score.hrv_rmssd_milli ?? null;
      restingHr = score.resting_heart_rate ?? null;
    } else if (!recoveryRes.ok) {
      syncErrors = appendSyncError(
        syncErrors,
        `Recovery fetch failed (${recoveryRes.status})`,
      );
    }

    let sleepHours: number | null = null;
    let sleepEfficiency: number | null = null;

    if (sleepRes.ok && sleepRes.data?.records?.[0]?.score) {
      const score = sleepRes.data.records[0].score;
      sleepHours =
        score.total_in_bed_time_milli != null
          ? score.total_in_bed_time_milli / 3_600_000
          : null;
      sleepEfficiency = score.sleep_efficiency_percentage ?? null;
    } else if (!sleepRes.ok) {
      syncErrors = appendSyncError(
        syncErrors,
        `Sleep fetch failed (${sleepRes.status})`,
      );
    }

    let strain: number | null = null;
    let calories: number | null = null;
    let whoopCycleId: string | null = null;

    if (cycleRes.ok && cycleRes.data?.records?.[0]) {
      const record = cycleRes.data.records[0];
      whoopCycleId = record.id != null ? String(record.id) : null;
      if (record.score) {
        strain = record.score.strain ?? null;
        calories =
          record.score.kilojoule != null
            ? record.score.kilojoule / 4.184
            : null;
      }
    } else if (!cycleRes.ok) {
      syncErrors = appendSyncError(
        syncErrors,
        `Cycle fetch failed (${cycleRes.status})`,
      );
    }

    // 5. Upsert today's health data
    const today = todayUTC();
    const { error: upsertError } = await supabase
      .from("mission_control_health")
      .upsert(
        {
          user_id: userId,
          date: today,
          recovery_score: recoveryScore,
          hrv_ms: hrvMs,
          resting_hr: restingHr,
          sleep_hours: sleepHours,
          sleep_efficiency: sleepEfficiency,
          strain,
          calories,
          whoop_cycle_id: whoopCycleId,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );

    if (upsertError) {
      syncErrors = appendSyncError(
        syncErrors,
        `Upsert failed: ${upsertError.message}`,
      );
      await supabase
        .from("mission_control_sync")
        .update({ whoop_sync_errors: syncErrors })
        .eq("user_id", userId);
      return errorResponse(
        `Failed to upsert health data: ${upsertError.message}`,
        500,
      );
    }

    // 6. Update sync state -- clear errors on success
    const { error: updateError } = await supabase
      .from("mission_control_sync")
      .update({
        last_whoop_sync: new Date().toISOString(),
        whoop_sync_errors: syncErrors.length > 0 ? syncErrors : [],
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update sync state:", updateError.message);
    }

    return jsonResponse({
      synced: true,
      date: today,
      fields: {
        recovery_score: recoveryScore,
        hrv_ms: hrvMs,
        resting_hr: restingHr,
        sleep_hours: sleepHours,
        sleep_efficiency: sleepEfficiency,
        strain,
        calories,
        whoop_cycle_id: whoopCycleId,
      },
      partialErrors: syncErrors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("whoop-sync fatal error:", msg);
    return errorResponse("Whoop sync failed", 500);
  }
});
