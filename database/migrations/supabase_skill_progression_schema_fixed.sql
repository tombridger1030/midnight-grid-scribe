-- Skill Progression Database Schema - CORRECTED VERSION
-- Run this in your Supabase SQL Editor

-- First, drop any existing policies and table if they exist (optional cleanup)
DROP POLICY IF EXISTS "Users can view their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can insert their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can update their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can delete their own skill progression" ON skill_progression;

-- Create skill_progression table
CREATE TABLE IF NOT EXISTS skill_progression (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_progression_user_id ON skill_progression(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_progression_updated_at ON skill_progression(updated_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_skill_progression_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS skill_progression_updated_at_trigger ON skill_progression;
CREATE TRIGGER skill_progression_updated_at_trigger
    BEFORE UPDATE ON skill_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_progression_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using the fixed user ID
-- These policies allow access for the fixed user ID 'fixed-user-id'
CREATE POLICY "Users can view their own skill progression"
    ON skill_progression
    FOR SELECT
    USING (user_id = 'fixed-user-id');

CREATE POLICY "Users can insert their own skill progression"
    ON skill_progression
    FOR INSERT
    WITH CHECK (user_id = 'fixed-user-id');

CREATE POLICY "Users can update their own skill progression"
    ON skill_progression
    FOR UPDATE
    USING (user_id = 'fixed-user-id')
    WITH CHECK (user_id = 'fixed-user-id');

CREATE POLICY "Users can delete their own skill progression"
    ON skill_progression
    FOR DELETE
    USING (user_id = 'fixed-user-id');

-- Grant necessary permissions
GRANT ALL ON skill_progression TO authenticated;
GRANT ALL ON skill_progression TO service_role;
GRANT ALL ON skill_progression TO anon;

-- Create a view for easier querying (optional)
CREATE OR REPLACE VIEW skill_progression_summary AS
SELECT 
    id,
    user_id,
    data->>'lastUpdated' as last_updated,
    jsonb_array_length(data->'skills') as skill_count,
    created_at,
    updated_at
FROM skill_progression;

-- Grant permissions on the view
GRANT SELECT ON skill_progression_summary TO authenticated;
GRANT SELECT ON skill_progression_summary TO service_role;
GRANT SELECT ON skill_progression_summary TO anon;

-- Test the table creation with a simple insert (optional - you can remove this)
-- INSERT INTO skill_progression (user_id, data) 
-- VALUES ('fixed-user-id', '{"skills": [], "lastUpdated": "2025-01-15T10:00:00Z", "kpiContributions": {}}')
-- ON CONFLICT DO NOTHING;

-- Verify the table was created successfully
SELECT 'skill_progression table created successfully' as status; 