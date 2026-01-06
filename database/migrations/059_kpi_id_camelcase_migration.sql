-- Migration: Rename KPI IDs from snake_case to camelCase
-- This fixes the mismatch between KPI configs and weekly values
--
-- Mappings:
--   prs_created        -> prRequests
--   deep_work_hours    -> deepWorkHours
--   commits_created    -> commitsCreated
--   training_sessions  -> strengthSessions
--   reading_progress   -> pagesRead
--   avg_sleep_hours    -> sleepAverage

-- ============================================================
-- 1. Update user_kpis table (KPI configurations)
-- ============================================================

-- prs_created -> prRequests
UPDATE user_kpis
SET kpi_id = 'prRequests'
WHERE kpi_id = 'prs_created';

-- deep_work_hours -> deepWorkHours
UPDATE user_kpis
SET kpi_id = 'deepWorkHours'
WHERE kpi_id = 'deep_work_hours';

-- commits_created -> commitsCreated
UPDATE user_kpis
SET kpi_id = 'commitsCreated'
WHERE kpi_id = 'commits_created';

-- training_sessions -> strengthSessions
UPDATE user_kpis
SET kpi_id = 'strengthSessions'
WHERE kpi_id = 'training_sessions';

-- reading_progress -> pagesRead
UPDATE user_kpis
SET kpi_id = 'pagesRead'
WHERE kpi_id = 'reading_progress';

-- avg_sleep_hours -> sleepAverage
UPDATE user_kpis
SET kpi_id = 'sleepAverage'
WHERE kpi_id = 'avg_sleep_hours';

-- ============================================================
-- 2. Update weekly_kpis table (actual values in JSONB)
-- ============================================================

-- Helper function to rename a key in weekly_kpis.data JSONB
-- This handles both root-level and data->values nested structures

-- prs_created -> prRequests
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'prs_created') ||
    jsonb_build_object('prRequests', data->'values'->'prs_created'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'prs_created';

-- Also handle legacy root-level keys
UPDATE weekly_kpis
SET data = (data - 'prs_created') ||
    jsonb_build_object('prRequests', data->'prs_created')
WHERE (not (data ? 'values')) and (data ? 'prs_created');

-- deep_work_hours -> deepWorkHours
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'deep_work_hours') ||
    jsonb_build_object('deepWorkHours', data->'values'->'deep_work_hours'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'deep_work_hours';

UPDATE weekly_kpis
SET data = (data - 'deep_work_hours') ||
    jsonb_build_object('deepWorkHours', data->'deep_work_hours')
WHERE (not (data ? 'values')) and (data ? 'deep_work_hours');

-- commits_created -> commitsCreated
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'commits_created') ||
    jsonb_build_object('commitsCreated', data->'values'->'commits_created'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'commits_created';

UPDATE weekly_kpis
SET data = (data - 'commits_created') ||
    jsonb_build_object('commitsCreated', data->'commits_created')
WHERE (not (data ? 'values')) and (data ? 'commits_created');

-- training_sessions -> strengthSessions
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'training_sessions') ||
    jsonb_build_object('strengthSessions', data->'values'->'training_sessions'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'training_sessions';

UPDATE weekly_kpis
SET data = (data - 'training_sessions') ||
    jsonb_build_object('strengthSessions', data->'training_sessions')
WHERE (not (data ? 'values')) and (data ? 'training_sessions');

-- reading_progress -> pagesRead
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'reading_progress') ||
    jsonb_build_object('pagesRead', data->'values'->'reading_progress'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'reading_progress';

UPDATE weekly_kpis
SET data = (data - 'reading_progress') ||
    jsonb_build_object('pagesRead', data->'reading_progress')
WHERE (not (data ? 'values')) and (data ? 'reading_progress');

-- avg_sleep_hours -> sleepAverage
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'avg_sleep_hours') ||
    jsonb_build_object('sleepAverage', data->'values'->'avg_sleep_hours'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'avg_sleep_hours';

UPDATE weekly_kpis
SET data = (data - 'avg_sleep_hours') ||
    jsonb_build_object('sleepAverage', data->'avg_sleep_hours')
WHERE (not (data ? 'values')) and (data ? 'avg_sleep_hours');

-- ============================================================
-- 3. Update __daily nested structure if present
-- ============================================================

-- prs_created -> prRequests in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'prs_created') ||
    jsonb_build_object('prRequests', data->'__daily'->'prs_created'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'prs_created';

-- deep_work_hours -> deepWorkHours in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'deep_work_hours') ||
    jsonb_build_object('deepWorkHours', data->'__daily'->'deep_work_hours'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'deep_work_hours';

-- commits_created -> commitsCreated in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'commits_created') ||
    jsonb_build_object('commitsCreated', data->'__daily'->'commits_created'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'commits_created';

-- training_sessions -> strengthSessions in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'training_sessions') ||
    jsonb_build_object('strengthSessions', data->'__daily'->'training_sessions'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'training_sessions';

-- reading_progress -> pagesRead in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'reading_progress') ||
    jsonb_build_object('pagesRead', data->'__daily'->'reading_progress'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'reading_progress';

-- avg_sleep_hours -> sleepAverage in __daily
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'avg_sleep_hours') ||
    jsonb_build_object('sleepAverage', data->'__daily'->'avg_sleep_hours'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'avg_sleep_hours';
