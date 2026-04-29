-- Update recurring schedule windows while preserving the Wednesday exception.

UPDATE public.schedule_blocks
   SET start_time = '07:00',
       end_time   = '08:00'
 WHERE label = 'Wakeup'
   AND archived_at IS NULL;

UPDATE public.schedule_blocks
   SET start_time = '08:00',
       end_time   = '13:00'
 WHERE label = 'Cortal Block I'
   AND archived_at IS NULL;

UPDATE public.schedule_blocks
   SET start_time = '19:30',
       end_time   = '20:30'
 WHERE label = 'Meal'
   AND days_of_week = ARRAY[1,2,4,5,6]
   AND archived_at IS NULL;

UPDATE public.schedule_blocks
   SET start_time = '20:30',
       end_time   = '22:30'
 WHERE label = 'Study'
   AND days_of_week = ARRAY[1,2,4,5,6]
   AND archived_at IS NULL;
