CREATE TABLE IF NOT EXISTS public.weekly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('recording', 'published', 'corrupted')),
  attempt_started_at timestamptz,
  recording_started_at timestamptz,
  published_at timestamptz,
  video_path text,
  video_url text,
  duration_seconds integer CHECK (
    duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 60
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_logs_owner_week_unique UNIQUE (owner_user_id, week_key),
  CONSTRAINT weekly_logs_week_range_valid CHECK (week_end = week_start + 6)
);

CREATE INDEX IF NOT EXISTS idx_weekly_logs_owner_week_start
  ON public.weekly_logs (owner_user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_logs_status
  ON public.weekly_logs (status, week_start DESC);

ALTER TABLE public.weekly_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_logs_public_read" ON public.weekly_logs;
CREATE POLICY "weekly_logs_public_read"
  ON public.weekly_logs
  FOR SELECT
  USING (
    status IN ('published', 'corrupted')
    OR (
      status = 'recording'
      AND attempt_started_at IS NOT NULL
      AND attempt_started_at < now() - interval '2 minutes'
    )
  );

DROP POLICY IF EXISTS "weekly_logs_owner_read" ON public.weekly_logs;
CREATE POLICY "weekly_logs_owner_read"
  ON public.weekly_logs
  FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "weekly_logs_owner_insert" ON public.weekly_logs;
CREATE POLICY "weekly_logs_owner_insert"
  ON public.weekly_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND owner_user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  );

DROP POLICY IF EXISTS "weekly_logs_owner_update" ON public.weekly_logs;
CREATE POLICY "weekly_logs_owner_update"
  ON public.weekly_logs
  FOR UPDATE
  USING (
    auth.uid() = owner_user_id
    AND owner_user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    AND owner_user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  );

GRANT SELECT ON public.weekly_logs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.weekly_logs TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'weekly-log-videos',
  'weekly-log-videos',
  true,
  104857600,
  ARRAY['video/webm', 'video/mp4', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "weekly_log_videos_owner_insert" ON storage.objects;
CREATE POLICY "weekly_log_videos_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'weekly-log-videos'
    AND auth.uid() = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  );

DROP POLICY IF EXISTS "weekly_log_videos_owner_update" ON storage.objects;
CREATE POLICY "weekly_log_videos_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'weekly-log-videos'
    AND auth.uid() = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  )
  WITH CHECK (
    bucket_id = 'weekly-log-videos'
    AND auth.uid() = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  );

DROP POLICY IF EXISTS "weekly_log_videos_owner_delete" ON storage.objects;
CREATE POLICY "weekly_log_videos_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'weekly-log-videos'
    AND auth.uid() = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid
  );
