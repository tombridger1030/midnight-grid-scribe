-- Per-date KPI entries for daily bubble values
-- Run this in the Supabase SQL editor

create table if not exists weekly_kpi_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date text not null, -- ISO YYYY-MM-DD
  week_key text not null,
  kpi_id text not null,
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date, kpi_id)
);

create or replace function set_updated_at_weekly_kpi_entries()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists trg_weekly_kpi_entries_set_updated_at on weekly_kpi_entries;
create trigger trg_weekly_kpi_entries_set_updated_at
before update on weekly_kpi_entries
for each row execute function set_updated_at_weekly_kpi_entries();

-- Optional backfill/rename existing KPI ids in entries table
-- Rename old 'coldPlunges' KPI id to new 'recoverySessions'
update weekly_kpi_entries
set kpi_id = 'recoverySessions'
where kpi_id = 'coldPlunges';


