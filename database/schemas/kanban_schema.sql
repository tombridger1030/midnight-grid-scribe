-- Kanban Tables for Supabase
-- Run this in the Supabase SQL Editor

-- Kanban boards table
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL, -- e.g., 'echo', 'noctisium'
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Kanban columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  column_id TEXT NOT NULL, -- e.g., 'backlog', 'in-progress', 'review', 'done'
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL, -- for ordering columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id, column_id)
);

-- Kanban tasks table
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  task_id TEXT NOT NULL, -- e.g., 'task-1', 'task-2'
  column_id TEXT NOT NULL, -- which column the task is in
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  labels JSONB DEFAULT '[]'::jsonb, -- array of label strings
  time_spent NUMERIC NOT NULL DEFAULT 0, -- hours
  position INTEGER NOT NULL DEFAULT 0, -- for ordering within column
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE, -- soft delete flag
  deleted_at TIMESTAMP WITH TIME ZONE, -- when the task was deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id, task_id)
);

-- Add soft delete columns to existing table (migration)
-- Run these if you already have the kanban_tasks table
ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_kanban_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_kanban_boards_updated_at ON kanban_boards;
CREATE TRIGGER update_kanban_boards_updated_at
  BEFORE UPDATE ON kanban_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_columns_updated_at ON kanban_columns;
CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_tasks_updated_at ON kanban_tasks;
CREATE TRIGGER update_kanban_tasks_updated_at
  BEFORE UPDATE ON kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_updated_at_column();

-- Insert default Echo board structure
INSERT INTO kanban_boards (user_id, board_id, name, description) 
VALUES ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'echo', 'Echo Kanban Board', 'Track Echo development tasks and progress')
ON CONFLICT (user_id, board_id) DO NOTHING;

-- Insert default columns for Echo board
INSERT INTO kanban_columns (user_id, board_id, column_id, title, color, position) VALUES
('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'echo', 'backlog', 'Backlog', '#8A8D93', 1),
('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'echo', 'in-progress', 'In Progress', '#53B4FF', 2),
('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'echo', 'review', 'Review', '#FFD700', 3),
('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'echo', 'done', 'Done', '#5FE3B3', 4)
ON CONFLICT (user_id, board_id, column_id) DO NOTHING; 