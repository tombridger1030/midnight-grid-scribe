-- Rename KPI id 'deepWorkBlocks' -> 'deepWorkHours' across Supabase storage

-- 1) Update per-date entries table
update weekly_kpi_entries
set kpi_id = 'deepWorkHours'
where kpi_id = 'deepWorkBlocks';

-- 2) Update weekly_kpis.data JSONB structure
-- values map
update weekly_kpis
set data = jsonb_set(
  data,
  '{values}',
  (
    coalesce(data->'values', '{}'::jsonb)
    - 'deepWorkBlocks'
  ) || (
    case when coalesce(data->'values', '{}'::jsonb) ? 'deepWorkBlocks'
         then jsonb_build_object('deepWorkHours', (data->'values'->'deepWorkBlocks'))
         else '{}'::jsonb
    end
  ),
  true
)
where coalesce(data->'values', '{}'::jsonb) ? 'deepWorkBlocks';

-- legacy root map
update weekly_kpis
set data = (
  (data - 'deepWorkBlocks') ||
  case when data ? 'deepWorkBlocks'
       then jsonb_build_object('deepWorkHours', data->'deepWorkBlocks')
       else '{}'::jsonb
  end
)
where (not (data ? 'values')) and (data ? 'deepWorkBlocks');

-- __daily
update weekly_kpis
set data = jsonb_set(
  data,
  '{__daily}',
  (
    (coalesce(data->'__daily', '{}'::jsonb) - 'deepWorkBlocks') ||
    case when coalesce(data->'__daily', '{}'::jsonb) ? 'deepWorkBlocks'
         then jsonb_build_object('deepWorkHours', (data->'__daily'->'deepWorkBlocks'))
         else '{}'::jsonb
    end
  ),
  true
)
where coalesce(data->'__daily', '{}'::jsonb) ? 'deepWorkBlocks';

-- __dailyByDate nested keys
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
                 (day_map - 'deepWorkBlocks') ||
                 case when day_map ? 'deepWorkBlocks'
                      then jsonb_build_object('deepWorkHours', day_map->'deepWorkBlocks')
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


