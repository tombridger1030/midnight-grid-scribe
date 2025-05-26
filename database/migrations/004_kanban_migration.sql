-- Kanban Soft Delete Migration
-- Run this in the Supabase SQL Editor to add soft delete functionality

-- Add soft delete columns to existing kanban_tasks table
ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'kanban_tasks' 
AND column_name IN ('is_deleted', 'deleted_at'); 