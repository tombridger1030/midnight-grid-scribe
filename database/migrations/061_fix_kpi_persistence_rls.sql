-- Migration: Fix KPI Persistence Issues
--
-- Problem: KPI values and settings were not persisting due to RLS policy mismatch
-- Root Cause: RLS policies comparing auth.uid() (UUID) with user_id (TEXT) without casting
-- Solution: Recreate all RLS policies with proper text casting
--
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. Fix weekly_kpis RLS policies
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can update own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can insert own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can delete own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can manage own weekly KPIs" ON weekly_kpis;

-- Create new policies with text casting
CREATE POLICY "Users can view own weekly KPIs" ON weekly_kpis
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own weekly KPIs" ON weekly_kpis
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own weekly KPIs" ON weekly_kpis
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own weekly KPIs" ON weekly_kpis
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Ensure RLS is enabled
ALTER TABLE weekly_kpis ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Fix user_kpis RLS policies
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can update own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can insert own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can delete own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can manage own KPIs" ON user_kpis;

-- Create new policies with text casting
CREATE POLICY "Users can view own KPIs" ON user_kpis
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own KPIs" ON user_kpis
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own KPIs" ON user_kpis
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own KPIs" ON user_kpis
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Ensure RLS is enabled
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Fix weekly_kpi_entries RLS policies
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can update own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can insert own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can delete own weekly KPI entries" ON weekly_kpi_entries;

-- Create new policies with text casting
CREATE POLICY "Users can view own weekly KPI entries" ON weekly_kpi_entries
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own weekly KPI entries" ON weekly_kpi_entries
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own weekly KPI entries" ON weekly_kpi_entries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own weekly KPI entries" ON weekly_kpi_entries
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Ensure RLS is enabled
ALTER TABLE weekly_kpi_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Verification query (should return current user's data)
-- ============================================================

-- Uncomment to verify policies work:
-- SELECT * FROM weekly_kpis WHERE user_id::text = auth.uid()::text;
-- SELECT * FROM user_kpis WHERE user_id::text = auth.uid()::text;
