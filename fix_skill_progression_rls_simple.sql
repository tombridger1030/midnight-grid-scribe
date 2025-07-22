-- Simple fix for skill_progression RLS policies

-- Enable RLS
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "skill_progression_select_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_insert_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_update_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_delete_policy" ON skill_progression;

-- Create new policies
CREATE POLICY "skill_progression_select_policy" ON skill_progression FOR SELECT USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "skill_progression_insert_policy" ON skill_progression FOR INSERT WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "skill_progression_update_policy" ON skill_progression FOR UPDATE USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b') WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "skill_progression_delete_policy" ON skill_progression FOR DELETE USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'); 