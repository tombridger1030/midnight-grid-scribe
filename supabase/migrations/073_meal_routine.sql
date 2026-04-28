-- ============================================================================
-- Migration 073: Meal block becomes routine (Y/N) instead of judged (clock-in)
--
-- Eating is binary: did you eat the planned meal at the planned slot, yes/no.
-- LLM judgment of "what did you eat" is overkill and time-tracking creates
-- the wrong pressure. Same model as Wakeup, Walk, BJJ.
-- ============================================================================

UPDATE public.schedule_blocks
   SET kind = 'routine'
 WHERE label = 'Meal';

-- Clear judged-only metadata from existing Meal block_instances. Keep status
-- (captured/skipped/pending) so historical Y/N marks are preserved.
UPDATE public.block_instances bi
   SET started_at      = NULL,
       ended_at        = NULL,
       quality_score   = NULL,
       quality_verdict = NULL,
       results_text    = NULL,
       results_summary = NULL
  FROM public.schedule_blocks sb
 WHERE bi.block_id = sb.id
   AND sb.label    = 'Meal';
