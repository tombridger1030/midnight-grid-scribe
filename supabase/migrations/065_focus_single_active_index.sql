CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_one_active_per_user
  ON public.focus_sessions(user_id)
  WHERE is_active = TRUE;
