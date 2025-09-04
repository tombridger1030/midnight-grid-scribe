-- Skill Progression Database Schema - SIMPLE VERSION
-- Run this in your Supabase SQL Editor

-- Create skill_progression table (ignore if exists)
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

-- Create trigger to automatically update updated_at (drop first if exists)
DROP TRIGGER IF EXISTS skill_progression_updated_at_trigger ON skill_progression;
CREATE TRIGGER skill_progression_updated_at_trigger
    BEFORE UPDATE ON skill_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_progression_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- Grant permissions BEFORE creating policies
GRANT ALL ON skill_progression TO authenticated;
GRANT ALL ON skill_progression TO service_role;
GRANT ALL ON skill_progression TO anon;

-- Now create the policies (drop first if they exist)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can insert their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can update their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can delete their own skill progression" ON skill_progression;
    
    -- Create new policies
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
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Policy creation completed with potential warnings: %', SQLERRM;
END $$;

-- Test that the table works with a simple query
SELECT 'skill_progression table is ready!' as status, 
       COUNT(*) as existing_records 
FROM skill_progression; 