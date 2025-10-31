-- Add optional per-week name override for KPIs

alter table if exists weekly_kpi_targets
  add column if not exists name_override text;

-- No change to RLS needed; existing policies apply

