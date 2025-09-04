-- Skill Progression Database Schema
-- Run this in your Supabase SQL Editor

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
CREATE TRIGGER skill_progression_updated_at_trigger
    BEFORE UPDATE ON skill_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_progression_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to view their own skill progression data
CREATE POLICY "Users can view their own skill progression"
    ON skill_progression
    FOR SELECT
    USING (user_id = current_user_id());

-- Allow users to insert their own skill progression data
CREATE POLICY "Users can insert their own skill progression"
    ON skill_progression
    FOR INSERT
    WITH CHECK (user_id = current_user_id());

-- Allow users to update their own skill progression data
CREATE POLICY "Users can update their own skill progression"
    ON skill_progression
    FOR UPDATE
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- Allow users to delete their own skill progression data
CREATE POLICY "Users can delete their own skill progression"
    ON skill_progression
    FOR DELETE
    USING (user_id = current_user_id());

-- Create a helper function to get current user ID
-- This should match your existing auth setup
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
    -- For testing purposes, we'll use a fixed user ID
    -- In production, this should return the authenticated user's ID
    RETURN 'fixed-user-id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON skill_progression TO authenticated;
GRANT ALL ON skill_progression TO service_role;

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

-- Sample data structure comment
/*
The data JSONB column should contain:
{
  "skills": [
    {
      "id": "netWorth",
      "name": "Net Worth",
      "category": "financial",
      "currentValue": 145000,
      "targetValue": 3500000,
      "unit": "USD",
      "startDate": "2025-01-01",
      "targetDate": "2027-07-08",
      "progressPercentage": 0,
      "lastUpdated": "2025-01-15T10:30:00Z",
      "color": "#FFD700",
      "icon": "💰",
      "checkpoints": [
        {
          "id": "checkpoint-1",
          "skillId": "netWorth",
          "name": "First 100K milestone",
          "description": "Reach 100K net worth",
          "targetDate": "2025-06-01",
          "isCompleted": false,
          "progressPercentage": 0,
          "notes": ""
        }
      ]
    }
  ],
  "lastUpdated": "2025-01-15T10:30:00Z",
  "kpiContributions": {
    "netWorth": [
      {
        "kpiId": "deepWorkBlocks",
        "weight": 40,
        "formula": "linear"
      }
    ]
  }
}
*/ 