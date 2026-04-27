-- ============================================================================
-- Migration 068: Clock-in/out per block + per-block quality + sleep targets
-- ============================================================================

-- Per-block quality (LLM-emitted on clock-out)
ALTER TABLE public.block_instances
  ADD COLUMN IF NOT EXISTS quality_score smallint CHECK (quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS quality_verdict text;

-- Add 'active' status (block clocked in, not yet clocked out)
ALTER TABLE public.block_instances DROP CONSTRAINT IF EXISTS block_instances_status_check;
ALTER TABLE public.block_instances
  ADD CONSTRAINT block_instances_status_check
  CHECK (status IN ('pending', 'active', 'captured', 'missed', 'adhoc', 'skipped'));

-- Operator settings (target sleep schedule + diet/exercise definitions)
CREATE TABLE IF NOT EXISTS public.operator_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_bedtime time NOT NULL DEFAULT '23:00',
  target_wake_time time NOT NULL DEFAULT '07:00',
  diet_definition text,
  exercise_definition text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.operator_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY operator_settings_owner ON public.operator_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER operator_settings_updated_at
  BEFORE UPDATE ON public.operator_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_settings TO authenticated;

-- Replace compute_sleep_sigma_7d: now measures avg minutes off-target per day
DROP FUNCTION IF EXISTS public.compute_sleep_sigma_7d(uuid, date);

CREATE OR REPLACE FUNCTION public.compute_sleep_sigma_7d(target_user uuid, target_date date)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  target_bed time;
  target_wake time;
  bed_target_min int;
  wake_target_min int;
  avg_offset numeric;
BEGIN
  SELECT target_bedtime, target_wake_time INTO target_bed, target_wake
  FROM public.operator_settings WHERE user_id = target_user;

  IF target_bed IS NULL THEN
    target_bed := '23:00'::time;
    target_wake := '07:00'::time;
  END IF;

  bed_target_min := EXTRACT(HOUR FROM target_bed)*60 + EXTRACT(MINUTE FROM target_bed);
  wake_target_min := EXTRACT(HOUR FROM target_wake)*60 + EXTRACT(MINUTE FROM target_wake);

  SELECT AVG(
    -- Bedtime offset: minutes diff from target, mod 24h, signed shortest path
    LEAST(
      ABS((EXTRACT(HOUR FROM (sleep_start_at AT TIME ZONE 'UTC'))*60 + EXTRACT(MINUTE FROM (sleep_start_at AT TIME ZONE 'UTC'))) - bed_target_min),
      1440 - ABS((EXTRACT(HOUR FROM (sleep_start_at AT TIME ZONE 'UTC'))*60 + EXTRACT(MINUTE FROM (sleep_start_at AT TIME ZONE 'UTC'))) - bed_target_min)
    )
    +
    LEAST(
      ABS((EXTRACT(HOUR FROM (sleep_end_at AT TIME ZONE 'UTC'))*60 + EXTRACT(MINUTE FROM (sleep_end_at AT TIME ZONE 'UTC'))) - wake_target_min),
      1440 - ABS((EXTRACT(HOUR FROM (sleep_end_at AT TIME ZONE 'UTC'))*60 + EXTRACT(MINUTE FROM (sleep_end_at AT TIME ZONE 'UTC'))) - wake_target_min)
    )
  )::numeric INTO avg_offset
  FROM public.daily_inputs
  WHERE user_id = target_user
    AND date BETWEEN target_date - INTERVAL '6 days' AND target_date
    AND sleep_start_at IS NOT NULL
    AND sleep_end_at IS NOT NULL;

  RETURN ROUND(avg_offset, 1);
END;
$$;

-- Seed Tom's actual schedule (single-user app — pick the only user)
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN RETURN; END IF;

  -- Wipe existing schedule + materialized instances
  DELETE FROM public.block_instances WHERE user_id = uid;
  DELETE FROM public.schedule_blocks WHERE user_id = uid;

  -- Seed operator settings (defaults)
  INSERT INTO public.operator_settings (user_id, target_bedtime, target_wake_time)
  VALUES (uid, '23:00', '07:00')
  ON CONFLICT (user_id) DO NOTHING;

  -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  INSERT INTO public.schedule_blocks (user_id, label, start_time, end_time, days_of_week) VALUES
    (uid, 'Wakeup',           '07:00', '07:30', ARRAY[0,1,2,3,4,5,6]),
    (uid, 'Cortal Block I',   '07:30', '13:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Shake + Walk',     '13:00', '14:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Cortal Block II',  '14:00', '16:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Walk',             '16:00', '16:30', ARRAY[1,2,3,4,5,6]),
    (uid, 'Cortal Block III', '16:30', '18:30', ARRAY[1,2,3,4,5,6]),
    (uid, 'Workout',          '18:30', '19:30', ARRAY[1,4]),
    (uid, 'Read',             '18:30', '19:30', ARRAY[2,5,6]),
    (uid, 'Watch BJJ',        '18:30', '19:00', ARRAY[3]),
    (uid, 'Pack + Leave',     '19:00', '19:30', ARRAY[3]),
    (uid, 'BJJ',              '19:30', '21:00', ARRAY[3]),
    (uid, 'Shower + Clean',   '21:00', '21:15', ARRAY[3]),
    (uid, 'Meal',             '19:30', '20:00', ARRAY[1,2,4,5,6]),
    (uid, 'Meal 3',           '21:15', '21:45', ARRAY[3]),
    (uid, 'Study',            '20:00', '22:30', ARRAY[1,2,4,5,6]),
    (uid, 'CEO Interview',    '21:45', '22:45', ARRAY[3]);
END $$;
