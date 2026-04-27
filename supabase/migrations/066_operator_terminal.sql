-- ============================================================================
-- Migration 066: Operator Terminal (v3 plan)
--
-- Replaces the bloated KPI/sprint/skill/content/focus system with a tight
-- 8-table operator tracker:
--   - daily_inputs (sleep, σ, exercise, diet)
--   - schedule_blocks + block_instances (schedule-driven work)
--   - daily_flow (AI-emitted score + verdict)
--   - monthly_goals (binary hit/miss)
--   - accountability_recipients + accountability_sends (email digest)
--   - blog_posts (free writing, no AI critique)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP bloat tables (IF EXISTS for fresh-DB safety)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.deep_work_sessions CASCADE;
DROP TABLE IF EXISTS public.focus_sessions CASCADE;
DROP TABLE IF EXISTS public.content_items CASCADE;
DROP TABLE IF EXISTS public.content_metrics CASCADE;
DROP TABLE IF EXISTS public.content_platforms CASCADE;
DROP TABLE IF EXISTS public.weekly_kpi_entries CASCADE;
DROP TABLE IF EXISTS public.user_kpis CASCADE;
DROP TABLE IF EXISTS public.training_sessions CASCADE;
DROP TABLE IF EXISTS public.training_types CASCADE;
DROP TABLE IF EXISTS public.user_skills CASCADE;
DROP TABLE IF EXISTS public.skill_progression CASCADE;
DROP TABLE IF EXISTS public.user_ranks CASCADE;
DROP TABLE IF EXISTS public.rank_history CASCADE;
DROP TABLE IF EXISTS public.weekly_rank_assessments CASCADE;
DROP TABLE IF EXISTS public.sprints CASCADE;
DROP TABLE IF EXISTS public.kanban_tasks CASCADE;
DROP TABLE IF EXISTS public.kanban_columns CASCADE;
DROP TABLE IF EXISTS public.daily_review_entries CASCADE;
DROP TABLE IF EXISTS public.daily_metrics CASCADE;
DROP TABLE IF EXISTS public.weekly_logs CASCADE;
DROP TABLE IF EXISTS public.activity_categories CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.nutrition_logs CASCADE;
DROP TABLE IF EXISTS public.weight_logs CASCADE;
DROP TABLE IF EXISTS public.sleep_logs CASCADE;

-- ----------------------------------------------------------------------------
-- daily_inputs — sleep + variance + exercise + diet, one row per user/day
-- ----------------------------------------------------------------------------

CREATE TABLE public.daily_inputs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  sleep_hours numeric(3,1),
  sleep_sigma_7d numeric(3,2),
  sleep_source text CHECK (sleep_source IN ('whoop', 'self')),
  exercise boolean,
  diet boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_inputs_owner ON public.daily_inputs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- schedule_blocks — recurring weekly schedule template
-- ----------------------------------------------------------------------------

CREATE TABLE public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  days_of_week integer[] NOT NULL,           -- 0=Sun..6=Sat
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (array_length(days_of_week, 1) > 0)
);

CREATE INDEX idx_schedule_blocks_user_active ON public.schedule_blocks(user_id) WHERE archived_at IS NULL;

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedule_blocks_owner ON public.schedule_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- block_instances — per-(block, date) row with results captured
-- ----------------------------------------------------------------------------

CREATE TABLE public.block_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.schedule_blocks(id) ON DELETE SET NULL,
  date date NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  results_text text,                         -- raw user input
  results_summary text,                      -- AI-cleaned one-liner
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'captured', 'missed', 'adhoc')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_block_instances_user_date ON public.block_instances(user_id, date DESC);
CREATE INDEX idx_block_instances_pending ON public.block_instances(user_id, status)
  WHERE status = 'pending';

ALTER TABLE public.block_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY block_instances_owner ON public.block_instances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- daily_flow — AI-emitted flow score + verdict, one row per user/day
-- ----------------------------------------------------------------------------

CREATE TABLE public.daily_flow (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  flow_score smallint CHECK (flow_score BETWEEN 0 AND 100),
  verdict text,
  model text,
  generated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.daily_flow ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_flow_owner ON public.daily_flow
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- monthly_goals — binary hit/missed, no XP/levels
-- ----------------------------------------------------------------------------

CREATE TABLE public.monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,                       -- first-of-month
  claim text NOT NULL,
  success_criteria text NOT NULL,
  threshold_numeric numeric,                 -- optional numeric threshold
  current_value numeric,                     -- updated nightly if numeric
  status text NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'hit', 'missed')),
  judged_at timestamptz,
  ai_override_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_monthly_goals_user_month ON public.monthly_goals(user_id, month DESC);

ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY monthly_goals_owner ON public.monthly_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- accountability_recipients — external accountability email config
-- ----------------------------------------------------------------------------

CREATE TABLE public.accountability_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  cadence text NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily', 'weekly')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_accountability_recipients_user_enabled
  ON public.accountability_recipients(user_id) WHERE enabled = true;

ALTER TABLE public.accountability_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY accountability_recipients_owner ON public.accountability_recipients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- accountability_sends — audit log of email sends
-- ----------------------------------------------------------------------------

CREATE TABLE public.accountability_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.accountability_recipients(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  subject text,
  send_status text NOT NULL DEFAULT 'sent' CHECK (send_status IN ('sent', 'failed')),
  error text
);

CREATE INDEX idx_accountability_sends_recipient_date
  ON public.accountability_sends(recipient_id, sent_at DESC);

ALTER TABLE public.accountability_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY accountability_sends_owner ON public.accountability_sends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accountability_recipients r
      WHERE r.id = accountability_sends.recipient_id AND r.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- blog_posts — 5 fields, simplest possible
-- ----------------------------------------------------------------------------

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'untitled',
  body_md text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_blog_posts_user_updated ON public.blog_posts(user_id, updated_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY blog_posts_owner ON public.blog_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_inputs_updated_at
  BEFORE UPDATE ON public.daily_inputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- compute_sleep_sigma_7d — rolling 7-day std-dev, called nightly via cron
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.compute_sleep_sigma_7d(target_user uuid, target_date date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT round(stddev_samp(sleep_hours)::numeric, 2)
  FROM public.daily_inputs
  WHERE user_id = target_user
    AND date BETWEEN target_date - interval '6 days' AND target_date
    AND sleep_hours IS NOT NULL;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_flow TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accountability_recipients TO authenticated;
GRANT SELECT ON public.accountability_sends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
