-- Simple migration to add missing columns to sprints table
-- Run this in your Supabase SQL Editor if the main migration fails

-- Add the missing columns
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS on_days INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS off_days INTEGER DEFAULT 7;

-- If status is currently an enum and 'planned' fails to add, 
-- you can temporarily change status to TEXT:
-- ALTER TABLE sprints ALTER COLUMN status TYPE TEXT;

-- Then you can insert 'planned' status sprints without issues

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sprints_date_range ON sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status); 