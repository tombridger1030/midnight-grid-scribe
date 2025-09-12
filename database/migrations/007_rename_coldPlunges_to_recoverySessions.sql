-- Rename KPI id 'coldPlunges' -> 'recoverySessions' across Supabase storage
-- Safe to run multiple times (idempotent transformations)

-- 1) Update per-date entries table
update weekly_kpi_entries
set kpi_id = 'recoverySessions'
where kpi_id = 'coldPlunges';

-- 2) Update weekly_kpis.data JSONB structure
-- 2a) If values are stored under data.values
update weekly_kpis
set data = jsonb_set(
  data,
  '{values}',
  (
    coalesce(data->'values', '{}'::jsonb)
    - 'coldPlunges'
  ) || (
    case when coalesce(data->'values', '{}'::jsonb) ? 'coldPlunges'
         then jsonb_build_object('recoverySessions', (data->'values'->'coldPlunges'))
         else '{}'::jsonb
    end
  ),
  true
)
where coalesce(data->'values', '{}'::jsonb) ? 'coldPlunges';

-- 2b) Legacy rows where values were stored at the root (no nested values key)
update weekly_kpis
set data = (
  (data - 'coldPlunges') ||
  case when data ? 'coldPlunges'
       then jsonb_build_object('recoverySessions', data->'coldPlunges')
       else '{}'::jsonb
  end
)
where (not (data ? 'values')) and (data ? 'coldPlunges');

-- 2c) Update __daily maps: rename key if present
update weekly_kpis
set data = jsonb_set(
  data,
  '{__daily}',
  (
    (coalesce(data->'__daily', '{}'::jsonb) - 'coldPlunges') ||
    case when coalesce(data->'__daily', '{}'::jsonb) ? 'coldPlunges'
         then jsonb_build_object('recoverySessions', (data->'__daily'->'coldPlunges'))
         else '{}'::jsonb
    end
  ),
  true
)
where coalesce(data->'__daily', '{}'::jsonb) ? 'coldPlunges';

-- 2d) Update __dailyByDate maps: rename nested keys per day
with updated as (
  select id,
         jsonb_set(
           data,
           '{__dailyByDate}',
           (
             select jsonb_object_agg(date_key, transformed_map)
             from jsonb_each(coalesce(data->'__dailyByDate', '{}'::jsonb)) as t(date_key, day_map)
             cross join lateral (
               select (
                 (day_map - 'coldPlunges') ||
                 case when day_map ? 'coldPlunges'
                      then jsonb_build_object('recoverySessions', day_map->'coldPlunges')
                      else '{}'::jsonb
                 end
               ) as transformed_map
             ) x
           ),
           true
         ) as new_data
  from weekly_kpis
  where data ? '__dailyByDate'
)
update weekly_kpis w
set data = u.new_data
from updated u
where w.id = u.id;


