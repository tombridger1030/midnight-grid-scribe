-- Comprehensive fix for sprints table
-- Run this in your Supabase SQL Editor

-- First, add the missing columns to the sprints table
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS on_days INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS off_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the status column to allow 'planned' status
-- First check if status is an enum or text
DO $$ 
BEGIN
    -- Try to add 'planned' to the status enum if it exists
    IF EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'sprint_status'
    ) THEN
        -- Add 'planned' to enum if not already there
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'planned' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sprint_status')
        ) THEN
            ALTER TYPE sprint_status ADD VALUE 'planned';
        END IF;
    ELSE
        -- If no enum exists, convert status to TEXT to allow any value
        ALTER TABLE sprints ALTER COLUMN status TYPE TEXT;
        -- Remove the old constraint if it exists
        ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_status_check;
        -- Add new constraint that includes 'planned'
        ALTER TABLE sprints ADD CONSTRAINT sprints_status_check 
        CHECK (status IN ('active', 'completed', 'planned'));
    END IF;
EXCEPTION
    WHEN others THEN
        -- If enum modification fails, convert to TEXT
        ALTER TABLE sprints ALTER COLUMN status TYPE TEXT;
        ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_status_check;
        ALTER TABLE sprints ADD CONSTRAINT sprints_status_check 
        CHECK (status IN ('active', 'completed', 'planned'));
END $$;

-- Drop any problematic triggers that might be causing the updated_at error
DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;

-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger properly (only on UPDATE, not INSERT)
CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sprints_user_id ON sprints(user_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_date_range ON sprints(start_date, end_date);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sprints' 
ORDER BY ordinal_position; 