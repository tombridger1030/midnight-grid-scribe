-- Weekly KPIs storage (per week with embedded daily data)
-- Run this in the Supabase SQL editor

create table if not exists weekly_kpis (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  week_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_key)
);

-- Trigger function to update updated_at
create or replace function set_updated_at_weekly_kpis()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

-- Recreate trigger idempotently
drop trigger if exists trg_weekly_kpis_set_updated_at on weekly_kpis;
create trigger trg_weekly_kpis_set_updated_at
before update on weekly_kpis
for each row execute function set_updated_at_weekly_kpis();


