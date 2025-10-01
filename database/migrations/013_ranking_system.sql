-- =============================================================================
-- Migration 013: Ranking System
-- Description: Creates tables for the user ranking system with RR points and tier progression
-- Date: 2025-10-01
-- =============================================================================

-- Enable Row Level Security
SET session_replication_role = replica;

-- =============================================================================
-- 1. CREATE USER RANKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_ranks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_rank TEXT NOT NULL CHECK (current_rank IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    rr_points INTEGER NOT NULL DEFAULT 100 CHECK (rr_points >= 0),
    total_weeks INTEGER NOT NULL DEFAULT 0 CHECK (total_weeks >= 0),
    weeks_completed INTEGER NOT NULL DEFAULT 0 CHECK (weeks_completed >= 0),
    last_assessment TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_rank UNIQUE(user_id),
    CONSTRAINT weeks_completed_valid CHECK (weeks_completed <= total_weeks)
);

-- Create indexes
CREATE INDEX idx_user_ranks_user_id ON public.user_ranks(user_id);
CREATE INDEX idx_user_ranks_current_rank ON public.user_ranks(current_rank);
CREATE INDEX idx_user_ranks_rr_points ON public.user_ranks(rr_points DESC);
CREATE INDEX idx_user_ranks_last_assessment ON public.user_ranks(last_assessment);

-- =============================================================================
-- 2. CREATE RANK HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rank_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    old_rank TEXT NOT NULL CHECK (old_rank IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    new_rank TEXT NOT NULL CHECK (new_rank IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    old_rr INTEGER NOT NULL CHECK (old_rr >= 0),
    new_rr INTEGER NOT NULL CHECK (new_rr >= 0),
    completion_percentage INTEGER NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rank_history_user_id ON public.rank_history(user_id);
CREATE INDEX idx_rank_history_week_key ON public.rank_history(week_key);
CREATE INDEX idx_rank_history_timestamp ON public.rank_history(timestamp DESC);
CREATE INDEX idx_rank_history_user_week ON public.rank_history(user_id, week_key);

-- =============================================================================
-- 3. CREATE WEEKLY ASSESSMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    completion_percentage INTEGER NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    rr_change INTEGER NOT NULL,
    rank_before TEXT NOT NULL CHECK (rank_before IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    rank_after TEXT NOT NULL CHECK (rank_after IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    kpi_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    assessed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_week_assessment UNIQUE(user_id, week_key)
);

-- Create indexes
CREATE INDEX idx_weekly_assessments_user_id ON public.weekly_assessments(user_id);
CREATE INDEX idx_weekly_assessments_week_key ON public.weekly_assessments(week_key);
CREATE INDEX idx_weekly_assessments_assessed_at ON public.weekly_assessments(assessed_at DESC);
CREATE INDEX idx_weekly_assessments_user_week ON public.weekly_assessments(user_id, week_key);
CREATE INDEX idx_weekly_assessments_completion ON public.weekly_assessments(completion_percentage);

-- =============================================================================
-- 4. CREATE UPDATED_AT TRIGGER FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_user_ranks()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_user_ranks_set_updated_at ON public.user_ranks;
CREATE TRIGGER trg_user_ranks_set_updated_at
    BEFORE UPDATE ON public.user_ranks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_user_ranks();

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_assessments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. CREATE RLS POLICIES
-- =============================================================================

-- User Ranks Policies
DROP POLICY IF EXISTS "Users can view own rank" ON public.user_ranks;
CREATE POLICY "Users can view own rank" ON public.user_ranks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rank" ON public.user_ranks;
CREATE POLICY "Users can insert own rank" ON public.user_ranks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rank" ON public.user_ranks;
CREATE POLICY "Users can update own rank" ON public.user_ranks
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rank" ON public.user_ranks;
CREATE POLICY "Users can delete own rank" ON public.user_ranks
    FOR DELETE USING (auth.uid() = user_id);

-- Rank History Policies
DROP POLICY IF EXISTS "Users can view own rank history" ON public.rank_history;
CREATE POLICY "Users can view own rank history" ON public.rank_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rank history" ON public.rank_history;
CREATE POLICY "Users can insert own rank history" ON public.rank_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weekly Assessments Policies
DROP POLICY IF EXISTS "Users can view own assessments" ON public.weekly_assessments;
CREATE POLICY "Users can view own assessments" ON public.weekly_assessments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assessments" ON public.weekly_assessments;
CREATE POLICY "Users can insert own assessments" ON public.weekly_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assessments" ON public.weekly_assessments;
CREATE POLICY "Users can update own assessments" ON public.weekly_assessments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 7. CREATE UTILITY VIEWS
-- =============================================================================

-- View for rank leaderboard (optional - can be used for future features)
CREATE OR REPLACE VIEW public.rank_leaderboard AS
SELECT
    ur.user_id,
    ur.current_rank,
    ur.rr_points,
    ur.total_weeks,
    ur.weeks_completed,
    CASE
        WHEN ur.total_weeks > 0 THEN ROUND((ur.weeks_completed::numeric / ur.total_weeks::numeric) * 100, 1)
        ELSE 0
    END as success_rate,
    ur.last_assessment,
    ur.updated_at
FROM public.user_ranks ur
ORDER BY ur.rr_points DESC, ur.weeks_completed DESC;

-- View for user rank statistics
CREATE OR REPLACE VIEW public.user_rank_stats AS
SELECT
    ur.user_id,
    ur.current_rank,
    ur.rr_points,
    ur.total_weeks,
    ur.weeks_completed,
    COALESCE(recent_assessments.avg_completion, 0) as avg_recent_completion,
    COALESCE(recent_assessments.total_rr_change, 0) as recent_rr_change,
    ur.last_assessment,
    ur.updated_at
FROM public.user_ranks ur
LEFT JOIN (
    SELECT
        wa.user_id,
        AVG(wa.completion_percentage) as avg_completion,
        SUM(wa.rr_change) as total_rr_change
    FROM public.weekly_assessments wa
    WHERE wa.assessed_at >= NOW() - INTERVAL '4 weeks'
    GROUP BY wa.user_id
) recent_assessments ON ur.user_id = recent_assessments.user_id;

-- =============================================================================
-- 8. GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ranks TO authenticated;
GRANT SELECT, INSERT ON public.rank_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.weekly_assessments TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.rank_leaderboard TO authenticated;
GRANT SELECT ON public.user_rank_stats TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 9. INSERT DEFAULT RANK CONFIGURATIONS (Optional Reference Data)
-- =============================================================================

-- Create a reference table for rank configurations (for documentation purposes)
CREATE TABLE IF NOT EXISTS public.rank_configs (
    rank_name TEXT PRIMARY KEY CHECK (rank_name IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
    min_rr INTEGER NOT NULL,
    max_rr INTEGER NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    multiplier NUMERIC(3,1) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert rank configuration data
INSERT INTO public.rank_configs (rank_name, min_rr, max_rr, color, icon, multiplier, description)
VALUES
    ('bronze', 0, 199, '#CD7F32', '🥉', 1.0, 'Bronze tier - starting rank for all users'),
    ('gold', 200, 499, '#FFD700', '🥇', 1.5, 'Gold tier - consistent performance required'),
    ('platinum', 500, 999, '#E5E4E2', '💎', 2.0, 'Platinum tier - high performance standards'),
    ('diamond', 1000, 1999, '#185ADB', '💎', 3.0, 'Diamond tier - exceptional performance required'),
    ('grandmaster', 2000, 9999, '#B026FF', '👑', 5.0, 'Grandmaster tier - elite performance level')
ON CONFLICT (rank_name) DO UPDATE SET
    min_rr = EXCLUDED.min_rr,
    max_rr = EXCLUDED.max_rr,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    multiplier = EXCLUDED.multiplier,
    description = EXCLUDED.description;

-- Make rank_configs read-only for users
ALTER TABLE public.rank_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rank configs" ON public.rank_configs FOR SELECT USING (true);
GRANT SELECT ON public.rank_configs TO authenticated, anon;

-- =============================================================================
-- 10. RESET SESSION REPLICATION ROLE
-- =============================================================================
SET session_replication_role = DEFAULT;

-- =============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify the migration worked)
-- =============================================================================

/*
-- Verify tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_ranks', 'rank_history', 'weekly_assessments', 'rank_configs')
ORDER BY table_name;

-- Verify indexes were created
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_ranks', 'rank_history', 'weekly_assessments')
ORDER BY tablename, indexname;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_ranks', 'rank_history', 'weekly_assessments', 'rank_configs');

-- Verify rank configurations
SELECT * FROM public.rank_configs ORDER BY min_rr;

-- Test views
SELECT COUNT(*) as rank_leaderboard_count FROM public.rank_leaderboard;
SELECT COUNT(*) as user_rank_stats_count FROM public.user_rank_stats;
*/

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TABLE public.user_ranks IS 'Stores current ranking information for each user';
COMMENT ON TABLE public.rank_history IS 'Historical record of all rank changes';
COMMENT ON TABLE public.weekly_assessments IS 'Weekly performance assessments and RR changes';
COMMENT ON TABLE public.rank_configs IS 'Reference table for rank tier configurations';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 013: Ranking System completed successfully';
    RAISE NOTICE 'Tables created: user_ranks, rank_history, weekly_assessments, rank_configs';
    RAISE NOTICE 'Views created: rank_leaderboard, user_rank_stats';
    RAISE NOTICE 'RLS policies enabled for all tables';
END $$;