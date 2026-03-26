# Mission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden `/mission-control` public page showing engineering output (GitHub commits/PRs) and health telemetry (Whoop) with predictions, in a SpaceX mission control aesthetic.

**Architecture:** Three Supabase Edge Functions (github-sync cron, whoop-sync cron, mission-control-api read endpoint). Tokens in Supabase Vault. Predictions computed server-side via `regression-js`. Client is a thin renderer polling the API every 5 minutes. Public route outside the auth gate.

**Tech Stack:** Vite, React, React Router, TypeScript, Tailwind CSS, Framer Motion, Supabase Edge Functions (Deno), pg_cron, regression-js, Vitest

**Design doc:** `~/.gstack/projects/tombridger1030-midnight-grid-scribe/tombridger-main-design-20260325-105749.md`
**Eng review:** Cleared 2026-03-25. 7 issues resolved. 3 critical gaps to address in implementation.

---

## File Structure

```
NEW:
  src/pages/MissionControl.tsx                    ← public page (inline components)
  src/styles/mission-control-tokens.ts            ← SpaceX monochrome design tokens
  supabase/functions/_shared/utils.ts             ← shared edge fn: client init, error helpers, vault
  supabase/functions/github-sync/index.ts         ← cron: fetch GitHub commits/PRs → Supabase
  supabase/functions/whoop-sync/index.ts          ← cron: fetch Whoop recovery/sleep/strain → Supabase
  supabase/functions/mission-control-api/index.ts ← read API: aggregate + predict + serve JSON
  supabase/migrations/061_mission_control.sql     ← 3 tables + RLS + Vault entries
  src/components/settings/WhoopSection.tsx         ← minimal Whoop OAuth button for Settings
  vitest.config.ts                                ← test framework setup
  src/__tests__/predictions.test.ts               ← prediction engine tests
  src/__tests__/mission-control-api.test.ts       ← API response shape tests

MODIFY:
  src/App.tsx                                     ← add public route outside auth gate
  src/pages/Settings.tsx                          ← import WhoopSection
  package.json                                    ← add regression-js, vitest
```

---

## Task 1: Project Setup (Vitest + Dependencies)

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/tombridger/Desktop/Desktop/PRODUCTS/noctisium
bun add regression
bun add -d vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit",
"lint:file": "eslint"
```

- [ ] **Step 4: Verify Vitest runs**

```bash
bun run test
```

Expected: 0 tests found, no errors.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json bun.lockb
git commit -m "chore: add Vitest test framework and regression-js dependency"
```

---

## Task 2: Database Migration

**Files:**

- Create: `supabase/migrations/061_mission_control.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Mission Control: engineering output + health telemetry tables
-- Supports the public /mission-control dashboard

-- Engineering output (one row per repo per day)
CREATE TABLE IF NOT EXISTS mission_control_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  repo_name text NOT NULL,
  commit_count int NOT NULL DEFAULT 0,
  prs_created int NOT NULL DEFAULT 0,
  prs_merged int NOT NULL DEFAULT 0,
  last_commit_sha text, -- cursor for incremental sync
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, repo_name)
);

-- Health telemetry (one row per day)
CREATE TABLE IF NOT EXISTS mission_control_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  recovery_score numeric,
  hrv_ms numeric,
  resting_hr numeric,
  sleep_hours numeric,
  sleep_efficiency numeric,
  strain numeric,
  calories numeric,
  whoop_cycle_id text, -- cursor for incremental sync
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Sync state (no tokens - those go in Vault)
CREATE TABLE IF NOT EXISTS mission_control_sync (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repos text[] DEFAULT '{}',
  whoop_connected boolean DEFAULT false,
  whoop_token_expires_at timestamptz,
  last_github_sync timestamptz,
  last_whoop_sync timestamptz,
  github_sync_errors jsonb DEFAULT '[]',
  whoop_sync_errors jsonb DEFAULT '[]'
);

-- RLS: only the owning user can read/write their own data (via authenticated role)
ALTER TABLE mission_control_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_control_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_control_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own commits" ON mission_control_commits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own health" ON mission_control_health
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sync" ON mission_control_sync
  FOR ALL USING (auth.uid() = user_id);

-- Service role (edge functions) can read/write all rows via service_role key
-- No additional policy needed — service_role bypasses RLS

-- Indexes for common queries
CREATE INDEX idx_mc_commits_user_date ON mission_control_commits(user_id, date DESC);
CREATE INDEX idx_mc_health_user_date ON mission_control_health(user_id, date DESC);

-- Note: GitHub token, Whoop access_token, and Whoop refresh_token
-- are stored in Supabase Vault (vault.secrets), not in this table.
-- Insert tokens manually via Supabase Dashboard > Vault after initial OAuth.

-- Helper function to read vault secrets (Supabase JS client can't query vault schema directly)
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1;
$$;

-- Helper function to update vault secrets (for token refresh)
CREATE OR REPLACE FUNCTION public.update_vault_secret(secret_name text, new_secret text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE vault.secrets SET secret = new_secret WHERE name = secret_name;
$$;

-- Restrict these functions to service_role only
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
REVOKE ALL ON FUNCTION public.update_vault_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_vault_secret(text, text) TO service_role;
```

- [ ] **Step 2: Apply migration locally**

```bash
cd /Users/tombridger/Desktop/Desktop/PRODUCTS/noctisium
bunx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/061_mission_control.sql
git commit -m "feat: add mission control database schema (commits, health, sync)"
```

---

## Task 3: Design Tokens

**Files:**

- Create: `src/styles/mission-control-tokens.ts`

- [ ] **Step 1: Create SpaceX monochrome token file**

```typescript
// src/styles/mission-control-tokens.ts
// SpaceX mission control aesthetic — monochrome, operational, understated.
// Separate from the main cyberpunk design tokens.

export const mcTokens = {
  colors: {
    bg: {
      primary: "#080808",
      panel: "#0f0f0f",
      elevated: "#141414",
    },
    text: {
      primary: "#e8e8e8",
      secondary: "#555555",
      muted: "#333333",
      dim: "#222222",
    },
    border: {
      default: "#151515",
      subtle: "#111111",
    },
    trend: {
      positive: "#4a4",
      negative: "#a44",
      neutral: "#555555",
    },
    status: {
      synced: "#4a4",
      error: "#a44",
      stale: "#a84",
    },
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    hero: { size: "72px", weight: "200", lineHeight: "1" },
    metric: { size: "22px", weight: "300" },
    label: {
      size: "10px",
      weight: "400",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
    body: { size: "13px", weight: "400" },
    tiny: {
      size: "9px",
      weight: "400",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
  },
  spacing: {
    page: "32px",
    section: "24px",
    row: "20px",
    inner: "14px",
  },
  animation: {
    staggerDelay: 0.08,
    fadeIn: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const;
```

- [ ] **Step 2: Lint**

```bash
bun run lint:file -- src/styles/mission-control-tokens.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/mission-control-tokens.ts
git commit -m "feat: add mission control SpaceX monochrome design tokens"
```

---

## Task 4: Shared Edge Function Utilities

**Files:**

- Create: `supabase/functions/_shared/utils.ts`

- [ ] **Step 1: Create shared utilities**

```typescript
// supabase/functions/_shared/utils.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export async function getVaultSecret(
  supabase: ReturnType<typeof createServiceClient>,
  name: string,
): Promise<string | null> {
  // Uses custom SQL function created in migration (can't query vault schema via JS client)
  const { data, error } = await supabase.rpc("get_vault_secret", {
    secret_name: name,
  });
  if (error || !data) return null;
  return data as string;
}

export function getMissionControlUserId(): string {
  const userId = Deno.env.get("MISSION_CONTROL_USER_ID");
  if (!userId) throw new Error("MISSION_CONTROL_USER_ID not set");
  return userId;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/utils.ts
git commit -m "feat: add shared edge function utilities (client, CORS, vault, errors)"
```

---

## Task 5: GitHub Sync Edge Function

**Files:**

- Create: `supabase/functions/github-sync/index.ts`

- [ ] **Step 1: Write the GitHub sync function**

```typescript
// supabase/functions/github-sync/index.ts
import {
  createServiceClient,
  getMissionControlUserId,
  errorResponse,
  jsonResponse,
  corsHeaders,
  getVaultSecret,
} from "../_shared/utils.ts";

const GITHUB_API = "https://api.github.com";

interface CommitData {
  date: string;
  repo_name: string;
  commit_count: number;
  prs_created: number;
  prs_merged: number;
  last_commit_sha: string | null;
}

async function fetchGitHubData(
  token: string,
  repos: string[],
  since: string,
): Promise<CommitData[]> {
  const results: CommitData[] = [];

  for (const repo of repos) {
    try {
      // Fetch commits
      const commitsRes = await fetch(
        `${GITHUB_API}/repos/${repo}/commits?since=${since}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (commitsRes.status === 401) throw new Error("GitHub token expired");
      if (commitsRes.status === 429) throw new Error("GitHub rate limit hit");
      if (!commitsRes.ok) continue; // skip repo on other errors

      const commits = await commitsRes.json();

      // Group commits by date
      const byDate = new Map<
        string,
        { count: number; lastSha: string | null }
      >();
      for (const c of commits) {
        const date = c.commit.author.date.substring(0, 10); // YYYY-MM-DD
        const existing = byDate.get(date) || { count: 0, lastSha: null };
        existing.count++;
        if (!existing.lastSha) existing.lastSha = c.sha;
        byDate.set(date, existing);
      }

      // Fetch PRs (GitHub pulls API has no `since` param — fetch last 100 and filter by date)
      const prsRes = await fetch(
        `${GITHUB_API}/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      const allPrs = prsRes.ok ? await prsRes.json() : [];
      // Filter PRs by date client-side (API doesn't support `since`)
      const prs = allPrs.filter((pr: any) => pr.updated_at >= since);

      const prsByDate = new Map<string, { created: number; merged: number }>();
      for (const pr of prs) {
        const createdDate = pr.created_at.substring(0, 10);
        const existing = prsByDate.get(createdDate) || {
          created: 0,
          merged: 0,
        };
        existing.created++;
        if (pr.merged_at) {
          const mergedDate = pr.merged_at.substring(0, 10);
          const mergedExisting = prsByDate.get(mergedDate) || {
            created: 0,
            merged: 0,
          };
          mergedExisting.merged++;
          prsByDate.set(mergedDate, mergedExisting);
        }
        prsByDate.set(createdDate, existing);
      }

      // Merge commit and PR data
      const allDates = new Set([...byDate.keys(), ...prsByDate.keys()]);
      for (const date of allDates) {
        const commitData = byDate.get(date) || { count: 0, lastSha: null };
        const prData = prsByDate.get(date) || { created: 0, merged: 0 };
        results.push({
          date,
          repo_name: repo,
          commit_count: commitData.count,
          prs_created: prData.created,
          prs_merged: prData.merged,
          last_commit_sha: commitData.lastSha,
        });
      }
    } catch (err) {
      if (
        err.message === "GitHub token expired" ||
        err.message === "GitHub rate limit hit"
      ) {
        throw err; // propagate critical errors
      }
      console.error(`Error fetching ${repo}:`, err);
      continue; // skip repo on network/parse errors
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = createServiceClient();
    const userId = getMissionControlUserId();

    // Get GitHub token from Vault
    const token = await getVaultSecret(supabase, "github_token");
    if (!token) return errorResponse("GitHub token not configured", 400);

    // Get repos to track from sync table
    const { data: syncData } = await supabase
      .from("mission_control_sync")
      .select("github_repos, last_github_sync")
      .eq("user_id", userId)
      .single();

    const repos = syncData?.github_repos || [];
    if (repos.length === 0)
      return jsonResponse({ message: "No repos configured" });

    // Fetch since last sync or last 7 days
    const since = syncData?.last_github_sync
      ? new Date(syncData.last_github_sync).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const data = await fetchGitHubData(token, repos, since);

    // Upsert data (ON CONFLICT UPDATE)
    if (data.length > 0) {
      const rows = data.map((d) => ({ user_id: userId, ...d }));
      const { error } = await supabase
        .from("mission_control_commits")
        .upsert(rows, { onConflict: "user_id,date,repo_name" });
      if (error) throw error;
    }

    // Update sync timestamp and clear errors
    await supabase.from("mission_control_sync").upsert(
      {
        user_id: userId,
        last_github_sync: new Date().toISOString(),
        github_sync_errors: [],
      },
      { onConflict: "user_id" },
    );

    return jsonResponse({ synced: data.length, repos: repos.length });
  } catch (err) {
    console.error("GitHub sync error:", err);

    // Log error to sync table (append to errors array, max 10)
    try {
      const supabase = createServiceClient();
      const userId = getMissionControlUserId();
      const { data: existing } = await supabase
        .from("mission_control_sync")
        .select("github_sync_errors")
        .eq("user_id", userId)
        .single();

      const errors = (existing?.github_sync_errors || []).slice(-9);
      errors.push({ message: err.message, at: new Date().toISOString() });

      await supabase
        .from("mission_control_sync")
        .upsert(
          { user_id: userId, github_sync_errors: errors },
          { onConflict: "user_id" },
        );
    } catch {
      /* ignore logging errors */
    }

    return errorResponse(err.message);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/github-sync/index.ts
git commit -m "feat: add GitHub sync edge function with cursor-based incremental sync"
```

---

## Task 6: Whoop Sync Edge Function

**Files:**

- Create: `supabase/functions/whoop-sync/index.ts`

- [ ] **Step 1: Write the Whoop sync function**

```typescript
// supabase/functions/whoop-sync/index.ts
import {
  createServiceClient,
  getMissionControlUserId,
  errorResponse,
  jsonResponse,
  corsHeaders,
  getVaultSecret,
} from "../_shared/utils.ts";

const WHOOP_API = "https://api.prod.whoop.com/developer";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

async function refreshWhoopToken(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string | null> {
  const refreshToken = await getVaultSecret(supabase, "whoop_refresh_token");
  const clientId = Deno.env.get("WHOOP_CLIENT_ID");
  const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET");

  if (!refreshToken || !clientId || !clientSecret) return null;

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
    // Token revoked or expired — disconnect Whoop
    await supabase
      .from("mission_control_sync")
      .update({ whoop_connected: false, whoop_token_expires_at: null })
      .eq("user_id", userId);
    return null;
  }

  const tokens = await res.json();

  // Store new tokens in Vault (update existing secrets)
  // Note: This requires the secrets to already exist in Vault.
  // The initial OAuth flow creates them; this just refreshes the values.
  // Uses custom SQL function created in migration (update_vault_secret)
  await supabase.rpc("update_vault_secret", {
    secret_name: "whoop_access_token",
    new_secret: tokens.access_token,
  });
  await supabase.rpc("update_vault_secret", {
    secret_name: "whoop_refresh_token",
    new_secret: tokens.refresh_token,
  });

  // Update expiry in sync table
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();
  await supabase
    .from("mission_control_sync")
    .update({ whoop_token_expires_at: expiresAt })
    .eq("user_id", userId);

  return tokens.access_token;
}

async function fetchWhoopData(token: string): Promise<{
  recovery: { score: number; hrv: number; resting_hr: number } | null;
  sleep: { hours: number; efficiency: number } | null;
  cycle: { strain: number; calories: number; id: string } | null;
}> {
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch latest recovery
  const recoveryRes = await fetch(`${WHOOP_API}/v2/recovery?limit=1`, {
    headers,
  });
  const recoveryData = recoveryRes.ok ? await recoveryRes.json() : null;
  const recovery = recoveryData?.records?.[0]
    ? {
        score: recoveryData.records[0].score?.recovery_score ?? null,
        hrv: recoveryData.records[0].score?.hrv_rmssd_milli ?? null,
        resting_hr: recoveryData.records[0].score?.resting_heart_rate ?? null,
      }
    : null;

  // Fetch latest sleep
  const sleepRes = await fetch(`${WHOOP_API}/v2/activity/sleep?limit=1`, {
    headers,
  });
  const sleepData = sleepRes.ok ? await sleepRes.json() : null;
  const sleep = sleepData?.records?.[0]
    ? {
        hours:
          (sleepData.records[0].score?.stage_summary?.total_in_bed_time_milli ??
            0) / 3600000,
        efficiency:
          sleepData.records[0].score?.sleep_efficiency_percentage ?? null,
      }
    : null;

  // Fetch latest cycle (strain + calories)
  const cycleRes = await fetch(`${WHOOP_API}/v2/cycle?limit=1`, { headers });
  const cycleData = cycleRes.ok ? await cycleRes.json() : null;
  const cycle = cycleData?.records?.[0]
    ? {
        strain: cycleData.records[0].score?.strain ?? null,
        calories: cycleData.records[0].score?.kilojoule
          ? Math.round(cycleData.records[0].score.kilojoule / 4.184)
          : null,
        id: cycleData.records[0].id,
      }
    : null;

  return { recovery, sleep, cycle };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = createServiceClient();
    const userId = getMissionControlUserId();

    // Check if Whoop is connected
    const { data: syncData } = await supabase
      .from("mission_control_sync")
      .select("whoop_connected, whoop_token_expires_at")
      .eq("user_id", userId)
      .single();

    if (!syncData?.whoop_connected) {
      return jsonResponse({ message: "Whoop not connected" });
    }

    // Get or refresh access token
    let token = await getVaultSecret(supabase, "whoop_access_token");
    const expires = syncData.whoop_token_expires_at
      ? new Date(syncData.whoop_token_expires_at)
      : null;

    if (!token || (expires && expires < new Date())) {
      token = await refreshWhoopToken(supabase, userId);
      if (!token)
        return errorResponse("Whoop token refresh failed — disconnected", 401);
    }

    // Fetch data
    const { recovery, sleep, cycle } = await fetchWhoopData(token);

    // Upsert today's health data (handle partial data with nulls)
    const today = new Date().toISOString().substring(0, 10);
    const { error } = await supabase.from("mission_control_health").upsert(
      {
        user_id: userId,
        date: today,
        recovery_score: recovery?.score ?? null,
        hrv_ms: recovery?.hrv ?? null,
        resting_hr: recovery?.resting_hr ?? null,
        sleep_hours: sleep?.hours ?? null,
        sleep_efficiency: sleep?.efficiency ?? null,
        strain: cycle?.strain ?? null,
        calories: cycle?.calories ?? null,
        whoop_cycle_id: cycle?.id ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    if (error) throw error;

    // Update sync timestamp
    await supabase
      .from("mission_control_sync")
      .update({
        last_whoop_sync: new Date().toISOString(),
        whoop_sync_errors: [],
      })
      .eq("user_id", userId);

    return jsonResponse({ synced: true, date: today });
  } catch (err) {
    console.error("Whoop sync error:", err);

    try {
      const supabase = createServiceClient();
      const userId = getMissionControlUserId();
      const { data: existing } = await supabase
        .from("mission_control_sync")
        .select("whoop_sync_errors")
        .eq("user_id", userId)
        .single();

      const errors = (existing?.whoop_sync_errors || []).slice(-9);
      errors.push({ message: err.message, at: new Date().toISOString() });

      await supabase
        .from("mission_control_sync")
        .update({ whoop_sync_errors: errors })
        .eq("user_id", userId);
    } catch {
      /* ignore */
    }

    return errorResponse(err.message);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/whoop-sync/index.ts
git commit -m "feat: add Whoop sync edge function with token refresh and partial data handling"
```

---

## Task 7: Mission Control API Edge Function

**Files:**

- Create: `supabase/functions/mission-control-api/index.ts`

- [ ] **Step 1: Write the read API function with server-side predictions**

```typescript
// supabase/functions/mission-control-api/index.ts
import {
  createServiceClient,
  getMissionControlUserId,
  errorResponse,
  jsonResponse,
  corsHeaders,
} from "../_shared/utils.ts";
// regression-js for Deno
import regression from "https://esm.sh/regression@2.0.1";

interface Prediction {
  text: string;
  targetDate: string | null;
  targetValue: number | null;
}

function computePrediction(
  dataPoints: { x: number; y: number }[],
  metricName: string,
  unit: string,
): Prediction | null {
  if (dataPoints.length < 14) return null;

  // Use last 90 data points (or all if < 90)
  const recent = dataPoints.slice(-90);
  const regressionData: [number, number][] = recent.map((p) => [p.x, p.y]);

  const result = regression.linear(regressionData);
  const rSquared = result.r2;

  // Suppress low-quality predictions
  if (rSquared < 0.3) return null;

  const slope = result.equation[0]; // daily change
  const intercept = result.equation[1];

  if (slope === 0) return null; // zero variance — no meaningful prediction

  // Project forward 30 days
  const lastX = recent[recent.length - 1].x;
  const projectedValue = slope * (lastX + 30) + intercept;

  // Find date when a round target is reached
  const currentValue = recent[recent.length - 1].y;
  const roundTarget = Math.ceil(currentValue / 100) * 100; // next round hundred
  const daysToTarget = slope > 0 ? (roundTarget - currentValue) / slope : null;

  const today = new Date();
  const targetDate =
    daysToTarget && daysToTarget > 0 && daysToTarget < 365
      ? new Date(today.getTime() + daysToTarget * 86400000)
          .toISOString()
          .substring(0, 10)
      : null;

  const slopePercent = (((slope * 7) / (currentValue || 1)) * 100).toFixed(1);
  const direction = slope > 0 ? "faster" : "slower";

  return {
    text: `At this rate, ${Math.round(projectedValue)} ${unit} by end of next month. You're shipping ${Math.abs(Number(slopePercent))}% ${direction} per week than your 90-day average.`,
    targetDate,
    targetValue: Math.round(projectedValue),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = createServiceClient();
    const userId = getMissionControlUserId();

    // Parallel queries for all data
    const [commitsResult, healthResult, syncResult] = await Promise.all([
      supabase
        .from("mission_control_commits")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .gte(
          "date",
          new Date(Date.now() - 90 * 86400000).toISOString().substring(0, 10),
        ),
      supabase
        .from("mission_control_health")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .gte(
          "date",
          new Date(Date.now() - 90 * 86400000).toISOString().substring(0, 10),
        ),
      supabase
        .from("mission_control_sync")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);

    const commits = commitsResult.data || [];
    const health = healthResult.data || [];
    const sync = syncResult.data;

    // Aggregate commits by date (across repos)
    const commitsByDate = new Map<
      string,
      { commits: number; prs_created: number; prs_merged: number }
    >();
    for (const row of commits) {
      const existing = commitsByDate.get(row.date) || {
        commits: 0,
        prs_created: 0,
        prs_merged: 0,
      };
      existing.commits += row.commit_count;
      existing.prs_created += row.prs_created;
      existing.prs_merged += row.prs_merged;
      commitsByDate.set(row.date, existing);
    }

    const today = new Date().toISOString().substring(0, 10);
    const todayCommits = commitsByDate.get(today) || {
      commits: 0,
      prs_created: 0,
      prs_merged: 0,
    };

    // Week and month aggregates
    const weekAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .substring(0, 10);
    const monthStart = today.substring(0, 7) + "-01";
    let weekTotal = 0,
      monthTotal = 0,
      monthPrsCreated = 0,
      monthPrsMerged = 0,
      shippingDays = 0;
    const daysInMonth = new Date(
      Number(today.substring(0, 4)),
      Number(today.substring(5, 7)),
      0,
    ).getDate();
    const dayOfMonth = Number(today.substring(8, 10));

    for (const [date, data] of commitsByDate) {
      if (date >= weekAgo) weekTotal += data.commits;
      if (date >= monthStart) {
        monthTotal += data.commits;
        monthPrsCreated += data.prs_created;
        monthPrsMerged += data.prs_merged;
        if (data.commits > 0) shippingDays++;
      }
    }

    // Sparkline data (30 days, one point per day)
    const sparklineCommits: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
        .toISOString()
        .substring(0, 10);
      sparklineCommits.push(commitsByDate.get(d)?.commits || 0);
    }

    // Commit prediction
    const commitDataPoints = Array.from(commitsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data], i) => ({ x: i, y: data.commits }));
    const commitPrediction = computePrediction(
      commitDataPoints,
      "commits",
      "commits",
    );

    // Health data
    const todayHealth = health.find((h) => h.date === today);
    const sparklineRecovery: (number | null)[] = [];
    const healthMap = new Map(health.map((h) => [h.date, h]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
        .toISOString()
        .substring(0, 10);
      sparklineRecovery.push(healthMap.get(d)?.recovery_score ?? null);
    }

    // Recovery prediction
    const recoveryDataPoints = health
      .filter((h) => h.recovery_score != null)
      .map((h, i) => ({ x: i, y: h.recovery_score }));
    const recoveryPrediction = computePrediction(
      recoveryDataPoints,
      "recovery",
      "%",
    );

    // Compute trend comparisons
    const prev30Commits = Array.from(commitsByDate.entries())
      .filter(([d]) => {
        const date = new Date(d);
        const thirtyAgo = new Date(Date.now() - 30 * 86400000);
        const sixtyAgo = new Date(Date.now() - 60 * 86400000);
        return date >= sixtyAgo && date < thirtyAgo;
      })
      .reduce((sum, [_, d]) => sum + d.commits, 0);
    const curr30Commits = Array.from(commitsByDate.entries())
      .filter(([d]) => new Date(d) >= new Date(Date.now() - 30 * 86400000))
      .reduce((sum, [_, d]) => sum + d.commits, 0);
    const commitTrendPercent =
      prev30Commits > 0
        ? Math.round(((curr30Commits - prev30Commits) / prev30Commits) * 100)
        : 0;

    // Sync status
    const lastGithubSync = sync?.last_github_sync;
    const lastWhoopSync = sync?.last_whoop_sync;
    const githubErrors = sync?.github_sync_errors || [];
    const whoopErrors = sync?.whoop_sync_errors || [];
    const githubStale = lastGithubSync
      ? Date.now() - new Date(lastGithubSync).getTime() > 3600000
      : true;
    const whoopStale = lastWhoopSync
      ? Date.now() - new Date(lastWhoopSync).getTime() > 3600000
      : true;

    return jsonResponse({
      engineering: {
        today: todayCommits.commits,
        repoCount: new Set(commits.map((c) => c.repo_name)).size,
        weekTotal,
        monthTotal,
        prsCreated: monthPrsCreated,
        prsMerged: monthPrsMerged,
        shippingDays,
        daysInMonth: dayOfMonth,
        sparkline: sparklineCommits,
        prediction: commitPrediction,
        trendPercent: commitTrendPercent,
      },
      health: {
        recovery: todayHealth?.recovery_score ?? null,
        hrv: todayHealth?.hrv_ms ?? null,
        restingHr: todayHealth?.resting_hr ?? null,
        sleepHours: todayHealth?.sleep_hours ?? null,
        sleepEfficiency: todayHealth?.sleep_efficiency ?? null,
        strain: todayHealth?.strain ?? null,
        calories: todayHealth?.calories ?? null,
        sparkline: sparklineRecovery,
        prediction: recoveryPrediction,
        connected: sync?.whoop_connected ?? false,
      },
      sync: {
        lastGithub: lastGithubSync,
        lastWhoop: lastWhoopSync,
        githubErrors: githubErrors.length >= 3,
        whoopErrors: whoopErrors.length >= 3,
        githubStale,
        whoopStale,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Mission control API error:", err);
    return errorResponse(err.message);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/mission-control-api/index.ts
git commit -m "feat: add mission control API edge function with server-side predictions"
```

---

## Task 8: Prediction Engine Tests

**Files:**

- Create: `src/__tests__/predictions.test.ts`

- [ ] **Step 1: Write prediction engine tests**

Note: The prediction logic lives in the edge function (Deno), but we can test the core algorithm as a pure function. Extract the `computePrediction` logic into a testable module, or test the API response shapes. For now, test the regression-js integration and our R-squared/threshold logic.

```typescript
// src/__tests__/predictions.test.ts
import { describe, it, expect } from "vitest";
import regression from "regression";

// Mirror the computePrediction logic from mission-control-api
function computePrediction(
  dataPoints: { x: number; y: number }[],
  unit: string,
): { text: string; targetValue: number } | null {
  if (dataPoints.length < 14) return null;

  const recent = dataPoints.slice(-90);
  const regressionData: [number, number][] = recent.map((p) => [p.x, p.y]);
  const result = regression.linear(regressionData);

  if (result.r2 < 0.3) return null;

  const slope = result.equation[0];
  if (slope === 0) return null;

  const lastX = recent[recent.length - 1].x;
  const projectedValue = slope * (lastX + 30) + result.equation[1];

  return {
    text: `At this rate, ${Math.round(projectedValue)} ${unit} by end of next month.`,
    targetValue: Math.round(projectedValue),
  };
}

describe("Prediction Engine", () => {
  it("returns null with fewer than 14 data points", () => {
    const data = Array.from({ length: 13 }, (_, i) => ({ x: i, y: i * 2 }));
    expect(computePrediction(data, "commits")).toBeNull();
  });

  it("returns prediction with 14+ data points and clear trend", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: 10 + i * 2,
    }));
    const result = computePrediction(data, "commits");
    expect(result).not.toBeNull();
    expect(result!.targetValue).toBeGreaterThan(70);
  });

  it("returns null when R-squared is below 0.3 (noisy data)", () => {
    // Random noise with no real trend
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: Math.sin(i * 3) * 50 + Math.random() * 100,
    }));
    // This may or may not return null depending on random values,
    // so we test the threshold behavior with controlled noise
    const noisyData = [
      { x: 0, y: 100 },
      { x: 1, y: 20 },
      { x: 2, y: 80 },
      { x: 3, y: 10 },
      { x: 4, y: 90 },
      { x: 5, y: 5 },
      { x: 6, y: 95 },
      { x: 7, y: 15 },
      { x: 8, y: 85 },
      { x: 9, y: 25 },
      { x: 10, y: 75 },
      { x: 11, y: 35 },
      { x: 12, y: 65 },
      { x: 13, y: 45 },
    ];
    const result = computePrediction(noisyData, "commits");
    expect(result).toBeNull();
  });

  it("returns null with zero variance (all identical values)", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 50 }));
    const result = computePrediction(data, "commits");
    expect(result).toBeNull(); // slope is 0
  });

  it("handles negative slope (declining metrics)", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: 100 - i * 2,
    }));
    const result = computePrediction(data, "%");
    expect(result).not.toBeNull();
    expect(result!.targetValue).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
bun run test
```

Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/predictions.test.ts
git commit -m "test: add prediction engine tests (thresholds, zero variance, negative slope)"
```

---

## Task 9: Mission Control Page (React Component)

**Files:**

- Create: `src/pages/MissionControl.tsx`

- [ ] **Step 1: Create the full page component**

This is the largest single file. It contains the status bar, two-column layout, hero numbers, sparklines, metric rows, and prediction blocks — all inline.

The component:

1. Fetches from the mission-control-api edge function on mount and every 5 minutes
2. Renders two halves: engineering output (left) and health telemetry (right)
3. Handles empty, partial, stale, and full data states
4. Uses Framer Motion for staggered fade-in animations
5. Uses the `mcTokens` design tokens (not the cyberpunk ones)

Key implementation notes:

- SVG sparklines rendered inline (no charting library — we want full control for the monochrome aesthetic)
- The Supabase Edge Function URL is `${SUPABASE_URL}/functions/v1/mission-control-api`
- No auth header needed — the edge function uses the env var for user_id
- Uses `fetch` directly (not the Supabase client) since this is a public page with no auth context

The file should be approximately 350-400 lines. If it exceeds 400, extract the sparkline SVG into a separate component.

**Implementation reference:** Use the wireframe screenshot at `/tmp/gstack-sketch-v2.png` and the design tokens from `src/styles/mission-control-tokens.ts` as the visual spec. The API response shape from Task 7 defines the data contract.

**Required states to implement:**

- **Full data**: Both engineering and health halves populated with hero numbers, sparklines, metrics, predictions
- **Empty state**: "Connect GitHub and Whoop in Settings to begin." centered, monochrome
- **Partial state** (GitHub yes, Whoop no): Engineering half renders, health half shows "Connect Whoop"
- **Stale state**: Status bar shows "SYNC ERROR" with last-data timestamp in muted red
- **Insufficient predictions** (< 14 days): Metric rows show data, prediction block shows "Collecting data... (X days until predictions)"

**Sparkline implementation**: Pure SVG with `<polyline>` for the data line, dashed `<polyline>` for projected extension, thin horizontal grid lines. Width fills container, height ~60px. Stroke `#e8e8e8` for data, `#333` for projection.

**Polling**: `useEffect` with `setInterval(fetchData, 5 * 60 * 1000)` + initial fetch on mount. Store data in `useState`.

**Mobile**: At `md:` breakpoint, two columns stack vertically (engineering on top, health below). Use `grid grid-cols-1 md:grid-cols-2`.

- [ ] **Step 2: Lint**

```bash
bun run lint:file -- src/pages/MissionControl.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/MissionControl.tsx
git commit -m "feat: add Mission Control page with SpaceX aesthetic and server-side predictions"
```

---

## Task 10: Route Integration

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add public route outside auth gate**

The critical change: move `BrowserRouter` outside `AppContent` and check the path before the auth check runs. Structure:

```
App
  → QueryClientProvider
    → AuthProvider
      → BrowserRouter              ← moved up
        → Routes
          → /mission-control        ← PUBLIC, no auth
          → /* → AppContent         ← auth-gated (existing behavior)
```

Modify `App.tsx`:

1. Import `MissionControl` from `@/pages/MissionControl`
2. Import `BrowserRouter, Routes, Route` at the top level
3. Move `<BrowserRouter>` out of `AppContent` and into `App`
4. Add `<Route path="/mission-control" element={<MissionControl />} />` BEFORE the catch-all
5. Wrap remaining routes in a new `<Route path="/*" element={<AppContent />} />`
6. Inside `AppContent`, remove the `<BrowserRouter>` wrapper (it's now at the parent level) and use `<Routes>` directly

- [ ] **Step 2: Verify existing routes still work**

```bash
bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /mission-control public route outside auth gate"
```

---

## Task 11: Whoop OAuth Settings Section

**Files:**

- Create: `src/components/settings/WhoopSection.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Create minimal Whoop section component**

A simple collapsible section (matching existing GitHubSection pattern) with a "Connect Whoop" button that redirects to the Whoop OAuth URL. The callback URL handling will store the tokens.

```typescript
// src/components/settings/WhoopSection.tsx
// Minimal Whoop OAuth connection button for Settings page.
// Follows the same pattern as GitHubSection.
```

Key implementation:

- "Connect Whoop" button → redirects to `https://api.prod.whoop.com/oauth/oauth2/auth` with client_id, redirect_uri, scope, response_type
- Scopes: `read:recovery read:sleep read:workout read:cycles read:body_measurement offline`
- Redirect URI: `{window.location.origin}/settings?whoop_callback=true`
- On page load, if `?whoop_callback=true` and `code` param exists, exchange for tokens via a new edge function (or handle manually)
- Show connected/disconnected status

- [ ] **Step 2: Add WhoopSection to Settings page**

Add import and render in `src/pages/Settings.tsx`:

```typescript
import { WhoopSection } from '@/components/settings';
// ... in the sections div, after GitHubSection:
<WhoopSection />
```

Also update the barrel export in `src/components/settings/index.ts`:

```typescript
export { WhoopSection } from "./WhoopSection";
```

- [ ] **Step 3: Lint**

```bash
bun run lint:file -- src/components/settings/WhoopSection.tsx src/pages/Settings.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/WhoopSection.tsx src/pages/Settings.tsx
git commit -m "feat: add Whoop OAuth connection button to Settings page"
```

---

## Task 12: Cron Scheduling (pg_cron)

**Files:**

- None (Supabase Dashboard / SQL)

- [ ] **Step 1: Set up cron jobs via SQL**

Run in Supabase SQL Editor (or add to a migration):

```sql
-- Schedule GitHub sync: every 15 minutes
SELECT cron.schedule(
  'github-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/github-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule Whoop sync: every 30 minutes
SELECT cron.schedule(
  'whoop-sync',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/whoop-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Set environment variables in Supabase Dashboard**

In Supabase Dashboard → Settings → Edge Functions → Secrets:

- `MISSION_CONTROL_USER_ID` = Tom's auth.users UUID
- `WHOOP_CLIENT_ID` = from Whoop Developer Portal
- `WHOOP_CLIENT_SECRET` = from Whoop Developer Portal

In Supabase Dashboard → Vault:

- `github_token` = GitHub personal access token
- `supabase_url` = project URL
- `service_role_key` = service role key

- [ ] **Step 3: Deploy edge functions**

```bash
cd /Users/tombridger/Desktop/Desktop/PRODUCTS/noctisium
bunx supabase functions deploy github-sync
bunx supabase functions deploy whoop-sync
bunx supabase functions deploy mission-control-api
```

- [ ] **Step 4: Commit any remaining files**

```bash
git add -A
git commit -m "feat: deploy edge functions and configure cron scheduling"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all tests**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Expected: No errors.

- [ ] **Step 4: Build**

```bash
bun run build
```

Expected: Build succeeds.

- [ ] **Step 5: Manual verification**

1. Start dev server: `bun run dev`
2. Navigate to `http://localhost:5173/mission-control`
3. Verify: page renders without auth
4. Verify: existing app at `/` still requires login
5. Verify: SpaceX aesthetic (monochrome, no cyberpunk elements)
6. Verify: empty state shows if no data synced yet

- [ ] **Step 6: Final commit if needed**

```bash
git status
# If any uncommitted changes:
git add -A
git commit -m "chore: final cleanup for mission control feature"
```
