-- Add missing swipe_rate column to content_metrics table
-- This is a safe migration that just adds the missing column

-- Check if the column already exists, if not add it
DO $$ 
BEGIN
    -- Add swipe_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'swipe_rate'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN swipe_rate NUMERIC;
        RAISE NOTICE 'Added swipe_rate column to content_metrics table';
    ELSE
        RAISE NOTICE 'swipe_rate column already exists in content_metrics table';
    END IF;
END $$;

-- Verify the column was added
SELECT 'swipe_rate column migration completed successfully!' as status;


