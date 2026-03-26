-- Mission Control: engineering output + health telemetry tables
-- Supports the private /mission-control dashboard

-- Engineering output (one row per repo per day)
CREATE TABLE IF NOT EXISTS mission_control_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  repo_name text NOT NULL,
  commit_count int NOT NULL DEFAULT 0,
  prs_created int NOT NULL DEFAULT 0,
  prs_merged int NOT NULL DEFAULT 0,
  last_commit_sha text,
  lines_added int NOT NULL DEFAULT 0,
  lines_deleted int NOT NULL DEFAULT 0,
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
  whoop_cycle_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Sync state (no tokens here - those go in Vault)
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

-- RLS: only the owning user can read/write their own data
ALTER TABLE mission_control_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_control_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_control_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own commits" ON mission_control_commits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own health" ON mission_control_health
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sync" ON mission_control_sync
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX idx_mc_commits_user_date ON mission_control_commits(user_id, date DESC);
CREATE INDEX idx_mc_health_user_date ON mission_control_health(user_id, date DESC);

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

-- Helper function to create vault secrets (for initial OAuth token storage)
CREATE OR REPLACE FUNCTION public.create_vault_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO vault.secrets (name, secret) VALUES (secret_name, secret_value)
  ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
$$;

-- Restrict vault helper functions to service_role only
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
REVOKE ALL ON FUNCTION public.update_vault_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_vault_secret(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.create_vault_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vault_secret(text, text) TO service_role;
