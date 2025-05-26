-- Migration to add missing columns to sprints table
-- Run this in your Supabase SQL Editor

-- Add end_date column (optional, for historical sprints)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add name column (optional sprint name)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add on_days column (custom ON days for this sprint)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS on_days INTEGER DEFAULT 21;

-- Add off_days column (custom OFF days for this sprint)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS off_days INTEGER DEFAULT 7;

-- Update status column to include 'planned' option
-- First, check if we need to modify the enum
DO $$ 
BEGIN
    -- Try to add 'planned' to the status enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'planned' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'sprint_status'
        )
    ) THEN
        ALTER TYPE sprint_status ADD VALUE 'planned';
    END IF;
EXCEPTION
    WHEN others THEN
        -- If the enum doesn't exist, we'll handle it differently
        NULL;
END $$;

-- If the status column is just text (not enum), this will work fine
-- If it's an enum and the above didn't work, you may need to:
-- 1. Add a new column with the enum
-- 2. Copy data over
-- 3. Drop old column
-- 4. Rename new column

-- Add some helpful comments
COMMENT ON COLUMN sprints.end_date IS 'Optional end date for historical or fixed-duration sprints';
COMMENT ON COLUMN sprints.name IS 'Optional human-readable name for the sprint';
COMMENT ON COLUMN sprints.on_days IS 'Number of ON days in this sprint cycle (default 21)';
COMMENT ON COLUMN sprints.off_days IS 'Number of OFF days in this sprint cycle (default 7)';

-- Create an index on start_date and end_date for better query performance
CREATE INDEX IF NOT EXISTS idx_sprints_date_range ON sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status); 