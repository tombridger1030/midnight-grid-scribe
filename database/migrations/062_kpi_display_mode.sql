-- Migration: Add display_mode column to user_kpis table
-- Enables KPIs to be rendered with daily breakdown (like Deep Work and PRs)

-- Add display_mode column with default 'simple'
ALTER TABLE user_kpis
ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'simple';

-- Add check constraint for valid values
ALTER TABLE user_kpis
ADD CONSTRAINT user_kpis_display_mode_check
CHECK (display_mode IN ('simple', 'daily_breakdown'));

-- Add comment for documentation
COMMENT ON COLUMN user_kpis.display_mode IS
  'Display mode for KPI: simple (basic counter row) or daily_breakdown (collapsible with per-day view)';
