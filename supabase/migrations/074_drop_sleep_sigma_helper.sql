-- ============================================================================
-- Migration 074: Drop the broken compute_sleep_sigma_7d helper + column
--
-- The SQL helper extracted hour/minute via `AT TIME ZONE 'UTC'`, so users in
-- non-UTC zones got a wrong rolling-7d offset. The same number is computed
-- correctly client-side in src/lib/inputsService.ts (computeSleepSigma7d),
-- which uses local time. The DB column is therefore unused for display and
-- only fed wrong data into flow-judge / accountability-digest.
-- ============================================================================

DROP FUNCTION IF EXISTS public.compute_sleep_sigma_7d(uuid, date);

ALTER TABLE public.daily_inputs DROP COLUMN IF EXISTS sleep_sigma_7d;
