-- Clear today's test block_instances (stale judgments from dev/QA).
-- Pending blocks for today will be re-materialized by operator-cron on next page load.

DELETE FROM public.block_instances
WHERE date = CURRENT_DATE
  AND user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';
