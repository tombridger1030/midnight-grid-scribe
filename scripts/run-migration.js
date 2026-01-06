/**
 * KPI ID Migration Script
 *
 * Run this script with: node scripts/run-migration.js <SERVICE_ROLE_KEY>
 *
 * This script updates KPI IDs from snake_case to camelCase in both:
 * - user_kpis table (KPI configurations)
 * - weekly_kpis table (actual values in JSONB)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ojwugyeyecddsoecpffs.supabase.co";

// Get service role key from command line argument
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error("Error: Service role key is required.");
  console.error("Usage: node scripts/run-migration.js <SERVICE_ROLE_KEY>");
  console.error(
    "\nGet your service role key from: https://supabase.com/dashboard/project/ojwugyeyecddsoecpffs/settings/api",
  );
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Migration SQL
const migrationSQL = `
-- ============================================================
-- 1. Update user_kpis table (KPI configurations)
-- ============================================================

UPDATE user_kpis
SET kpi_id = 'prRequests', updated_at = NOW()
WHERE kpi_id = 'prs_created';

UPDATE user_kpis
SET kpi_id = 'deepWorkHours', updated_at = NOW()
WHERE kpi_id = 'deep_work_hours';

UPDATE user_kpis
SET kpi_id = 'commitsCreated', updated_at = NOW()
WHERE kpi_id = 'commits_created';

UPDATE user_kpis
SET kpi_id = 'strengthSessions', updated_at = NOW()
WHERE kpi_id = 'training_sessions';

UPDATE user_kpis
SET kpi_id = 'pagesRead', updated_at = NOW()
WHERE kpi_id = 'reading_progress';

UPDATE user_kpis
SET kpi_id = 'sleepAverage', updated_at = NOW()
WHERE kpi_id = 'avg_sleep_hours';

-- ============================================================
-- 2. Update weekly_kpis table (actual values in JSONB)
-- ============================================================

-- Helper: rename key in data->values
UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{values}',
  (coalesce(data->'values', '{}'::jsonb) - 'prs_created') ||
    jsonb_build_object('prRequests', data->'values'->'prs_created'),
  true
)
WHERE coalesce(data->'values', '{}'::jsonb) ? 'prs_created';

UPDATE weekly_kpis
SET data = (data - 'prs_created') ||
    jsonb_build_object('prRequests', data->'prs_created')
WHERE (not (data ? 'values')) and (data ? 'prs_created');

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
-- 3. Update __daily nested structure
-- ============================================================

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'prs_created') ||
    jsonb_build_object('prRequests', data->'__daily'->'prs_created'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'prs_created';

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'deep_work_hours') ||
    jsonb_build_object('deepWorkHours', data->'__daily'->'deep_work_hours'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'deep_work_hours';

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'commits_created') ||
    jsonb_build_object('commitsCreated', data->'__daily'->'commits_created'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'commits_created';

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'training_sessions') ||
    jsonb_build_object('strengthSessions', data->'__daily'->'training_sessions'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'training_sessions';

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'reading_progress') ||
    jsonb_build_object('pagesRead', data->'__daily'->'reading_progress'),
  true)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'reading_progress';

UPDATE weekly_kpis
SET data = jsonb_set(
  data,
  '{__daily}',
  (coalesce(data->'__daily', '{}'::jsonb) - 'avg_sleep_hours') ||
    jsonb_build_object('sleepAverage', data->'__daily'->'avg_sleep_hours'),
  true
)
WHERE coalesce(data->'__daily', '{}'::jsonb) ? 'avg_sleep_hours';
`;

async function runMigration() {
  console.log("Starting KPI ID migration...\n");

  // Execute the migration using RPC
  const { data, error } = await supabase.rpc("exec_sql", {
    sql_query: migrationSQL,
  });

  if (error) {
    // If RPC doesn't exist, we'll need to use direct SQL execution
    console.error(
      "RPC exec_sql not available. Using direct query execution...\n",
    );

    // Run each update statement separately
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim().length === 0) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Use Postgres connection directly via REST
      const { error: stmtError } = await supabase
        .from("_migrations")
        .select("*")
        .limit(1);

      // For now, just show what needs to be run
      console.log(stmt.substring(0, 100) + "...");
    }

    console.log("\n⚠️  Direct execution requires service role permissions.");
    console.log(
      "\nPlease run the migration SQL manually in the Supabase SQL Editor:",
    );
    console.log(
      "https://supabase.com/dashboard/project/ojwugyeyecddsoecpffs/sql",
    );
    console.log(
      "\nCopy the SQL from: database/migrations/059_kpi_id_camelcase_migration.sql",
    );
    return;
  }

  console.log("✅ Migration completed successfully!");
  console.log("\nKPI IDs have been updated from snake_case to camelCase:");
  console.log("  - prs_created → prRequests");
  console.log("  - deep_work_hours → deepWorkHours");
  console.log("  - commits_created → commitsCreated");
  console.log("  - training_sessions → strengthSessions");
  console.log("  - reading_progress → pagesRead");
  console.log("  - avg_sleep_hours → sleepAverage");
}

runMigration().catch(console.error);
