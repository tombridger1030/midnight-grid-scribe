-- Ensure subscribers column exists in content_metrics table
-- This fixes the issue where subscribers data isn't being saved

-- Check current table structure
SELECT 'Current content_metrics columns:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_metrics' 
ORDER BY ordinal_position;

-- Check if subscribers column exists
DO $$ 
BEGIN
    -- Add subscribers column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'subscribers'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN subscribers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added subscribers column to content_metrics table';
    ELSE
        RAISE NOTICE 'subscribers column already exists in content_metrics table';
    END IF;
END $$;

-- Show updated table structure
SELECT 'Updated content_metrics columns:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_metrics' 
ORDER BY ordinal_position;

-- Test subscribers column works
SELECT 'Testing subscribers column:' as debug_step;
SELECT COUNT(*) as total_records, 
       COUNT(subscribers) as records_with_subscribers,
       AVG(subscribers) as avg_subscribers
FROM content_metrics;

SELECT 'Subscribers column ensured successfully!' as status;


