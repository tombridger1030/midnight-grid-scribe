// GitHub Sync Edge Function
// Fetches commits and PRs from GitHub API and upserts to mission_control_commits.
// Designed to run on a cron schedule.

import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  getMissionControlUserId,
  getVaultSecret,
  jsonResponse,
} from "../_shared/utils.ts";

const GITHUB_API = "https://api.github.com";
const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_SYNC_ERRORS = 10;

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
  };
}

interface GitHubPR {
  created_at: string;
  merged_at: string | null;
  state: string;
}

/** Build an ISO date string N days ago. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Extract YYYY-MM-DD from an ISO timestamp in UTC. */
function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Fetch with GitHub headers and basic error handling. */
async function githubFetch(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "noctisium-github-sync",
    },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") ?? "unknown";
    return {
      ok: false,
      status: 429,
      data: { message: `Rate limited. Retry-After: ${retryAfter}` },
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      status: 401,
      data: { message: "GitHub token expired or invalid" },
    };
  }

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      status: res.status,
      data: { message: `GitHub API error ${res.status}: ${body}` },
    };
  }

  const data = await res.json();
  return { ok: true, status: res.status, data };
}

/** Append an error entry to the errors array, capping at MAX_SYNC_ERRORS. */
function appendSyncError(
  existing: unknown[],
  repo: string,
  message: string,
): unknown[] {
  const entry = { repo, message, at: new Date().toISOString() };
  const errors = [...existing, entry];
  return errors.slice(-MAX_SYNC_ERRORS);
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const supabase = createServiceClient();

  try {
    const userId = getMissionControlUserId();

    // 1. Get GitHub token from Vault, fall back to env var
    const token =
      (await getVaultSecret(supabase, "github_token")) ||
      Deno.env.get("GITHUB_TOKEN");
    if (!token) {
      return errorResponse("GitHub token not configured", 500);
    }

    // 2. Get sync state (repos list, last sync time, existing errors)
    const { data: syncRow, error: syncError } = await supabase
      .from("mission_control_sync")
      .select("github_repos, last_github_sync, github_sync_errors")
      .eq("user_id", userId)
      .single();

    if (syncError || !syncRow) {
      return errorResponse("Sync config not found. Set up repos first.", 404);
    }

    const repos: string[] = syncRow.github_repos ?? [];
    if (repos.length === 0) {
      return jsonResponse({ message: "No repos configured", synced: 0 });
    }

    const sinceISO = syncRow.last_github_sync ?? daysAgo(DEFAULT_LOOKBACK_DAYS);
    const sinceDate = toDateKey(sinceISO);
    let syncErrors: unknown[] = syncRow.github_sync_errors ?? [];
    let totalUpserted = 0;

    // 3. Process each repo
    for (const repoFullName of repos) {
      try {
        // --- Fetch commits ---
        const commitsUrl = `${GITHUB_API}/repos/${repoFullName}/commits?since=${sinceISO}&per_page=100`;
        const commitsRes = await githubFetch(commitsUrl, token);

        if (!commitsRes.ok) {
          syncErrors = appendSyncError(
            syncErrors,
            repoFullName,
            (commitsRes.data as { message: string }).message,
          );
          // 401 means token is dead -- bail entirely
          if (commitsRes.status === 401) break;
          continue;
        }

        const commits = commitsRes.data as GitHubCommit[];

        // --- Fetch PRs (no `since` param available, filter in code) ---
        const prsUrl = `${GITHUB_API}/repos/${repoFullName}/pulls?state=all&sort=updated&direction=desc&per_page=100`;
        const prsRes = await githubFetch(prsUrl, token);

        let prs: GitHubPR[] = [];
        if (prsRes.ok) {
          const allPRs = prsRes.data as GitHubPR[];
          // Keep only PRs created or merged since our lookback window
          prs = allPRs.filter(
            (pr) =>
              pr.created_at >= sinceISO ||
              (pr.merged_at && pr.merged_at >= sinceISO),
          );
        } else {
          syncErrors = appendSyncError(
            syncErrors,
            repoFullName,
            `PRs fetch failed: ${(prsRes.data as { message: string }).message}`,
          );
          // Don't skip the repo -- we still have commit data
        }

        // --- Group by date ---
        const byDate = new Map<
          string,
          {
            commitCount: number;
            prsCreated: number;
            prsMerged: number;
            lastSha: string | null;
          }
        >();

        for (const c of commits) {
          const dateKey = toDateKey(c.commit.author.date);
          const entry = byDate.get(dateKey) ?? {
            commitCount: 0,
            prsCreated: 0,
            prsMerged: 0,
            lastSha: null,
          };
          entry.commitCount++;
          entry.lastSha = c.sha;
          byDate.set(dateKey, entry);
        }

        for (const pr of prs) {
          const createdDate = toDateKey(pr.created_at);
          if (createdDate >= sinceDate) {
            const entry = byDate.get(createdDate) ?? {
              commitCount: 0,
              prsCreated: 0,
              prsMerged: 0,
              lastSha: null,
            };
            entry.prsCreated++;
            byDate.set(createdDate, entry);
          }

          if (pr.merged_at) {
            const mergedDate = toDateKey(pr.merged_at);
            if (mergedDate >= sinceDate) {
              const entry = byDate.get(mergedDate) ?? {
                commitCount: 0,
                prsCreated: 0,
                prsMerged: 0,
                lastSha: null,
              };
              entry.prsMerged++;
              byDate.set(mergedDate, entry);
            }
          }
        }

        // --- Upsert rows ---
        for (const [dateKey, stats] of byDate) {
          const { error: upsertError } = await supabase
            .from("mission_control_commits")
            .upsert(
              {
                user_id: userId,
                date: dateKey,
                repo_name: repoFullName,
                commit_count: stats.commitCount,
                prs_created: stats.prsCreated,
                prs_merged: stats.prsMerged,
                last_commit_sha: stats.lastSha,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "user_id,date,repo_name" },
            );

          if (upsertError) {
            syncErrors = appendSyncError(
              syncErrors,
              repoFullName,
              `Upsert failed for ${dateKey}: ${upsertError.message}`,
            );
          } else {
            totalUpserted++;
          }
        }
      } catch (repoErr) {
        const msg =
          repoErr instanceof Error ? repoErr.message : String(repoErr);
        syncErrors = appendSyncError(syncErrors, repoFullName, msg);
      }
    }

    // 4. Update sync state
    const { error: updateError } = await supabase
      .from("mission_control_sync")
      .update({
        last_github_sync: new Date().toISOString(),
        github_sync_errors: syncErrors,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update sync state:", updateError.message);
    }

    return jsonResponse({
      synced: totalUpserted,
      repos: repos.length,
      errors: syncErrors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("github-sync fatal error:", msg);
    return errorResponse("GitHub sync failed", 500);
  }
});
