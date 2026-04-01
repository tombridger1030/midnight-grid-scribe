-- Skill progression row-based schema.
-- This migration must tolerate legacy tables that already exist with only a
-- subset of the current columns.

CREATE TABLE IF NOT EXISTS public.skill_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_level NUMERIC NOT NULL DEFAULT 0,
  target_level NUMERIC NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE public.skill_progression
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS skill_id TEXT,
  ADD COLUMN IF NOT EXISTS skill_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS current_level NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_level NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  has_legacy_data boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'skill_progression'
      AND column_name = 'data'
  ) INTO has_legacy_data;

  IF has_legacy_data THEN
    EXECUTE $sql$
      UPDATE public.skill_progression
      SET
        skill_id = COALESCE(
          NULLIF(skill_id, ''),
          NULLIF((data ->> 'skillId'), ''),
          NULLIF((data ->> 'id'), ''),
          'legacy-' || substring(md5(COALESCE(data::text, id::text, user_id)) for 12)
        ),
        skill_name = COALESCE(
          NULLIF(skill_name, ''),
          NULLIF((data ->> 'name'), ''),
          NULLIF((data ->> 'skillName'), ''),
          'Legacy Skill'
        ),
        category = COALESCE(
          NULLIF(category, ''),
          NULLIF((data ->> 'category'), ''),
          'general'
        ),
        current_level = COALESCE(
          current_level,
          NULLIF((data ->> 'currentValue'), '')::numeric,
          NULLIF((data ->> 'current_level'), '')::numeric,
          0
        ),
        target_level = COALESCE(
          target_level,
          NULLIF((data ->> 'targetValue'), '')::numeric,
          NULLIF((data ->> 'target_level'), '')::numeric,
          0
        ),
        progress_data = COALESCE(
          progress_data,
          CASE
            WHEN data IS NOT NULL THEN jsonb_build_object(
              'unit', data ->> 'unit',
              'icon', data ->> 'icon',
              'color', data ->> 'color',
              'checkpoints', COALESCE(data -> 'checkpoints', '[]'::jsonb),
              'progressPercentage',
                CASE
                  WHEN jsonb_typeof(data -> 'progressPercentage') = 'number'
                    THEN data -> 'progressPercentage'
                  ELSE to_jsonb(COALESCE(NULLIF((data ->> 'progressPercentage'), '')::numeric, 0))
                END
            )
            ELSE '{}'::jsonb
          END,
          '{}'::jsonb
        ),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
      WHERE
        skill_id IS NULL
        OR skill_name IS NULL
        OR category IS NULL
        OR progress_data IS NULL;
    $sql$;
  ELSE
    UPDATE public.skill_progression
    SET
      skill_id = COALESCE(NULLIF(skill_id, ''), 'legacy-' || substring(md5(COALESCE(id::text, user_id)) for 12)),
      skill_name = COALESCE(NULLIF(skill_name, ''), 'Legacy Skill'),
      category = COALESCE(NULLIF(category, ''), 'general'),
      current_level = COALESCE(current_level, 0),
      target_level = COALESCE(target_level, 0),
      progress_data = COALESCE(progress_data, '{}'::jsonb),
      created_at = COALESCE(created_at, NOW()),
      updated_at = COALESCE(updated_at, NOW())
    WHERE
      skill_id IS NULL
      OR skill_name IS NULL
      OR category IS NULL
      OR progress_data IS NULL;
  END IF;
END $$;

ALTER TABLE public.skill_progression
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN skill_id SET NOT NULL,
  ALTER COLUMN skill_name SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN current_level SET NOT NULL,
  ALTER COLUMN target_level SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'skill_progression_pkey'
      AND conrelid = 'public.skill_progression'::regclass
  ) THEN
    ALTER TABLE public.skill_progression
      ADD CONSTRAINT skill_progression_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'skill_progression_user_skill_key'
      AND conrelid = 'public.skill_progression'::regclass
  ) THEN
    ALTER TABLE public.skill_progression
      ADD CONSTRAINT skill_progression_user_skill_key UNIQUE (user_id, skill_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_progression_user_id
  ON public.skill_progression(user_id);

CREATE INDEX IF NOT EXISTS idx_skill_progression_user_skill
  ON public.skill_progression(user_id, skill_id);

ALTER TABLE public.skill_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own skill progression" ON public.skill_progression;
CREATE POLICY "Users can view own skill progression"
  ON public.skill_progression
  FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own skill progression" ON public.skill_progression;
CREATE POLICY "Users can insert own skill progression"
  ON public.skill_progression
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own skill progression" ON public.skill_progression;
CREATE POLICY "Users can update own skill progression"
  ON public.skill_progression
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own skill progression" ON public.skill_progression;
CREATE POLICY "Users can delete own skill progression"
  ON public.skill_progression
  FOR DELETE
  USING (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS update_skill_progression_updated_at ON public.skill_progression;
CREATE TRIGGER update_skill_progression_updated_at
  BEFORE UPDATE ON public.skill_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
