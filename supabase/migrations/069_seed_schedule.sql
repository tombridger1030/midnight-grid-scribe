-- Seed Tom's actual weekly schedule. Wipes existing schedule_blocks +
-- block_instances for the single user, then re-inserts the 16 blocks
-- from his calendar. Idempotent: re-running deletes and re-seeds.

DO $$
DECLARE
  uid uuid;
  inserted int;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE '069_seed_schedule: no auth.users found, skipping';
    RETURN;
  END IF;
  RAISE NOTICE '069_seed_schedule: seeding for user %', uid;

  DELETE FROM public.block_instances WHERE user_id = uid;
  DELETE FROM public.schedule_blocks WHERE user_id = uid;

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

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RAISE NOTICE '069_seed_schedule: inserted % schedule_blocks', inserted;
END $$;
