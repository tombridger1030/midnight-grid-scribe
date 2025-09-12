-- Remove deprecated KPIs and prepare for Engineering KPIs

-- Optional: delete social/git entries from weekly_kpi_entries (kept commented if you prefer historical data)
-- delete from weekly_kpi_entries where kpi_id in ('gitCommits','twitterDMs','linkedinMessages');

-- Remove keys from weekly_kpis.data.values
update weekly_kpis
set data = jsonb_set(
  data,
  '{values}',
  (
    coalesce(data->'values', '{}'::jsonb)
    - 'gitCommits' - 'twitterDMs' - 'linkedinMessages'
  ),
  true
)
where coalesce(data->'values', '{}'::jsonb) ?| array['gitCommits','twitterDMs','linkedinMessages'];

-- Remove from legacy root if present
update weekly_kpis
set data = (data - 'gitCommits' - 'twitterDMs' - 'linkedinMessages')
where (not (data ? 'values')) and (data ?| array['gitCommits','twitterDMs','linkedinMessages']);

-- Remove from __daily
update weekly_kpis
set data = jsonb_set(
  data,
  '{__daily}',
  (
    coalesce(data->'__daily', '{}'::jsonb)
    - 'gitCommits' - 'twitterDMs' - 'linkedinMessages'
  ),
  true
)
where coalesce(data->'__daily', '{}'::jsonb) ?| array['gitCommits','twitterDMs','linkedinMessages'];

-- Remove nested keys from __dailyByDate
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
                 day_map - 'gitCommits' - 'twitterDMs' - 'linkedinMessages'
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


