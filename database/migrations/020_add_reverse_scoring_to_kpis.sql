-- Migration: Add scoring preference fields to user_kpis table
-- These fields control how KPI progress is calculated based on the target value

-- Add reverse_scoring column if it doesn't exist
ALTER TABLE user_kpis
ADD COLUMN IF NOT EXISTS reverse_scoring BOOLEAN DEFAULT FALSE;

-- Add equal_is_better column if it doesn't exist  
ALTER TABLE user_kpis
ADD COLUMN IF NOT EXISTS equal_is_better BOOLEAN DEFAULT FALSE;

-- Add comments explaining the columns
COMMENT ON COLUMN user_kpis.reverse_scoring IS 'If true, being below target is good (lower values are better). If false, being above target is good (higher values are better)';
COMMENT ON COLUMN user_kpis.equal_is_better IS 'If true, being exactly at target is best, with scores decreasing as you move away from target in either direction. Overrides reverse_scoring when true.';

-- Example: Update screen time related KPIs to use reverse scoring (if they exist)
UPDATE user_kpis
SET reverse_scoring = TRUE
WHERE LOWER(name) LIKE '%screen time%'
   OR LOWER(name) LIKE '%screen%time%'
   OR LOWER(kpi_id) LIKE '%screentime%';

-- Example: Update sleep related KPIs to use equal is better (if they exist)
UPDATE user_kpis
SET equal_is_better = TRUE
WHERE LOWER(name) LIKE '%sleep%'
   AND (LOWER(name) LIKE '%average%' OR LOWER(name) LIKE '%hours%');
