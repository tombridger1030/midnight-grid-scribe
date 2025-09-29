-- Migration: Add is_average field to user_kpis table
-- This field indicates whether a KPI should calculate average of days with data (true) or sum (false)

-- Add is_average column if it doesn't exist
ALTER TABLE user_kpis
ADD COLUMN IF NOT EXISTS is_average BOOLEAN DEFAULT FALSE;

-- Update existing Sleep Average KPI to have is_average = true
UPDATE user_kpis
SET is_average = TRUE
WHERE kpi_id = 'sleepAverage'
   OR name = 'Sleep Average';

-- Add comment explaining the column
COMMENT ON COLUMN user_kpis.is_average IS 'If true, calculates average of days with data instead of sum';