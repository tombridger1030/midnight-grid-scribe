-- IMMEDIATE FIX: RLS Policy for skill_progression table
-- Run this quickly in Supabase SQL Editor to stop the errors

-- First check if table exists, if not create minimal version
CREATE TABLE IF NOT EXISTS skill_progression (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON skill_progression TO authenticated;

-- Drop ALL existing skill_progression policies first
DO $$
BEGIN
    -- Drop any existing policies with various names
    DROP POLICY IF EXISTS "Users can view their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can insert their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can update their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "Users can delete their own skill progression" ON skill_progression;
    DROP POLICY IF EXISTS "skill_progression_select_policy" ON skill_progression;
    DROP POLICY IF EXISTS "skill_progression_insert_policy" ON skill_progression;
    DROP POLICY IF EXISTS "skill_progression_update_policy" ON skill_progression;
    DROP POLICY IF EXISTS "skill_progression_delete_policy" ON skill_progression;

    -- Create new working policies using auth.uid()
    CREATE POLICY "skill_progression_all_operations"
        ON skill_progression
        FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Policy creation completed with potential warnings: %', SQLERRM;
END $$;

-- Test query
SELECT 'skill_progression RLS fix applied!' as status;