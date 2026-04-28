-- ============================================================================
-- Migration 067: Sleep window (bedtime + wake time) + drop Whoop
--
-- Replaces single sleep_hours number with sleep_start_at + sleep_end_at
-- timestamps. sleep_hours becomes a GENERATED column derived from those.
-- Also drops the Whoop-related mission_control_health table.
-- ============================================================================

-- Drop sleep_source check + column (no longer differentiating whoop vs self)
ALTER TABLE public.daily_inputs DROP COLUMN IF EXISTS sleep_source;

-- Replace sleep_hours (was numeric input) with two timestamps + generated col
ALTER TABLE public.daily_inputs DROP COLUMN IF EXISTS sleep_hours;

ALTER TABLE public.daily_inputs
  ADD COLUMN sleep_start_at timestamptz,
  ADD COLUMN sleep_end_at timestamptz;

-- sleep_hours is now derived. STORED so indexes/queries work normally.
ALTER TABLE public.daily_inputs
  ADD COLUMN sleep_hours numeric(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN sleep_start_at IS NOT NULL AND sleep_end_at IS NOT NULL AND sleep_end_at > sleep_start_at
      THEN round((EXTRACT(EPOCH FROM (sleep_end_at - sleep_start_at)) / 3600.0)::numeric, 2)
      ELSE NULL
    END
  ) STORED;

-- Drop the now-orphan Whoop landing table
DROP TABLE IF EXISTS public.mission_control_health CASCADE;
