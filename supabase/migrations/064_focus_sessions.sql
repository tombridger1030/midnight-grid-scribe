-- Focus sessions
-- Separate from deep_work_sessions so the new Focus page can evolve independently.

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT focus_sessions_valid_range
    CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started_at
  ON public.focus_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_active
  ON public.focus_sessions(user_id, is_active)
  WHERE is_active = TRUE;

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can view own focus sessions"
  ON public.focus_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can insert own focus sessions"
  ON public.focus_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can update own focus sessions"
  ON public.focus_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can delete own focus sessions"
  ON public.focus_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_focus_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER trigger_focus_sessions_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_focus_sessions_updated_at();

CREATE OR REPLACE FUNCTION public.calculate_focus_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    NEW.is_active = FALSE;
  ELSE
    NEW.duration_seconds = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_focus_session_duration ON public.focus_sessions;
CREATE TRIGGER trigger_focus_session_duration
  BEFORE INSERT OR UPDATE ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_focus_session_duration();
