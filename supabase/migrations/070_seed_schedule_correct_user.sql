-- Correction: 069 seeded the wrong user (auth.users LIMIT 1 picked an
-- abandoned account). Wipe both possible users' data and re-seed the
-- correct active user (0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b).

DO $$
DECLARE
  uid uuid := '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';
  exists_check int;
BEGIN
  SELECT COUNT(*) INTO exists_check FROM auth.users WHERE id = uid;
  IF exists_check = 0 THEN
    RAISE NOTICE '070: target user not found, skipping';
    RETURN;
  END IF;

  -- Clean up data on every user (we'd rather have one source of truth)
  DELETE FROM public.block_instances;
  DELETE FROM public.schedule_blocks;

  INSERT INTO public.operator_settings (user_id, target_bedtime, target_wake_time)
  VALUES (uid, '23:00', '07:00')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.schedule_blocks (user_id, label, start_time, end_time, days_of_week) VALUES
    (uid, 'Wakeup',           '07:00', '07:30', ARRAY[0,1,2,3,4,5,6]),
    (uid, 'Cortal Block I',   '07:30', '13:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Shake + Walk',     '13:00', '14:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Cortal Block II',  '14:00', '16:00', ARRAY[1,2,3,4,5,6]),
    (uid, 'Walk',             '16:00', '16:30', ARRAY[1,2,3,4,5,6]),
    (uid, 'Cortal Block III', '16:30', '18:30', ARRAY[1,2,3,4,5,6]),
    (uid, 'Workout',          '18:30', '19:30', ARRAY[1,4]),
    (uid, 'Read',             '18:30', '19:30', ARRAY[2,5,6]),
    (uid, 'Watch BJJ',        '18:30', '19:00', ARRAY[3]),
    (uid, 'Pack + Leave',     '19:00', '19:30', ARRAY[3]),
    (uid, 'BJJ',              '19:30', '21:00', ARRAY[3]),
    (uid, 'Shower + Clean',   '21:00', '21:15', ARRAY[3]),
    (uid, 'Meal',             '19:30', '20:00', ARRAY[1,2,4,5,6]),
    (uid, 'Meal 3',           '21:15', '21:45', ARRAY[3]),
    (uid, 'Study',            '20:00', '22:30', ARRAY[1,2,4,5,6]),
    (uid, 'CEO Interview',    '21:45', '22:45', ARRAY[3]);

  RAISE NOTICE '070: seeded 16 blocks for user %', uid;
END $$;
