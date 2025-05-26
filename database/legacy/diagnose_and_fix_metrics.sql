-- Comprehensive diagnosis and fix for metrics table issue

-- 1. Check what columns the metrics table actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'metrics' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what triggers exist on the metrics table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'metrics' AND trigger_schema = 'public';

-- 3. Drop the problematic trigger that's trying to update non-existent columns
DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;

-- 4. If you need to recreate the metrics table with the correct structure
-- (only run this if you want to ADD the timestamp columns):
/*
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
*/

-- 5. Verify no triggers remain that reference updated_at
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'metrics' AND trigger_schema = 'public';

-- 6. Alternative: Drop ALL triggers on metrics table (nuclear option)
-- Only use if the specific drop doesn't work
/*
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'metrics' AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON metrics';
    END LOOP;
END $$;
*/ 