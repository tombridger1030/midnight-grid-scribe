-- Ensure all expected columns exist in content_metrics table for Weekly Review functionality
-- This migration adds any missing columns that the application expects

DO $$ 
BEGIN
    -- Add follows column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'follows'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN follows INTEGER DEFAULT 0;
        RAISE NOTICE 'Added follows column to content_metrics table';
    ELSE
        RAISE NOTICE 'follows column already exists in content_metrics table';
    END IF;

    -- Add views column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'views'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN views INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views column to content_metrics table';
    ELSE
        RAISE NOTICE 'views column already exists in content_metrics table';
    END IF;

    -- Add retention_ratio column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'retention_ratio'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN retention_ratio NUMERIC;
        RAISE NOTICE 'Added retention_ratio column to content_metrics table';
    ELSE
        RAISE NOTICE 'retention_ratio column already exists in content_metrics table';
    END IF;

    -- Add snapshot_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'snapshot_date'
    ) THEN
        ALTER TABLE content_metrics ADD COLUMN snapshot_date DATE NOT NULL DEFAULT (NOW()::DATE);
        RAISE NOTICE 'Added snapshot_date column to content_metrics table';
    ELSE
        RAISE NOTICE 'snapshot_date column already exists in content_metrics table';
    END IF;

    -- Add content_id column if it doesn't exist (critical for relationships)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'content_id'
    ) THEN
        -- Check if content_items table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_items') THEN
            ALTER TABLE content_metrics ADD COLUMN content_id UUID REFERENCES content_items(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added content_id column to content_metrics table';
        ELSE
            ALTER TABLE content_metrics ADD COLUMN content_id UUID;
            RAISE NOTICE 'Added content_id column to content_metrics table (without foreign key - content_items table does not exist)';
        END IF;
    ELSE
        RAISE NOTICE 'content_id column already exists in content_metrics table';
    END IF;

    -- Ensure user_id is TEXT type (the application expects this)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_metrics' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Convert UUID to TEXT if needed
        ALTER TABLE content_metrics ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        RAISE NOTICE 'Converted user_id column from UUID to TEXT in content_metrics table';
    ELSE
        RAISE NOTICE 'user_id column is already TEXT type or does not exist';
    END IF;

END $$;

-- Verify the expected columns exist
SELECT 'Weekly Review columns migration completed successfully!' as status;

-- Show current table structure for verification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_metrics' 
ORDER BY ordinal_position;


