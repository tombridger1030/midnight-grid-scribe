-- Weekly KPI target overrides per week
-- Allows users to set week-specific targets that override global user_kpis targets

create table if not exists weekly_kpi_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  kpi_id text not null,
  target_value decimal not null,
  min_target_value decimal,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint weekly_kpi_targets_pkey primary key (user_id, week_key, kpi_id)
);

-- Trigger to update updated_at
create or replace function set_updated_at_weekly_kpi_targets()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_weekly_kpi_targets_set_updated_at on weekly_kpi_targets;
create trigger trg_weekly_kpi_targets_set_updated_at
before update on weekly_kpi_targets
for each row execute function set_updated_at_weekly_kpi_targets();

-- Enable RLS and add basic policies matching other user tables
alter table weekly_kpi_targets enable row level security;

do $$ begin
  create policy "Users can view own weekly targets" on weekly_kpi_targets for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own weekly targets" on weekly_kpi_targets for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own weekly targets" on weekly_kpi_targets for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete own weekly targets" on weekly_kpi_targets for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Helpful indexes
create index if not exists idx_weekly_kpi_targets_user_week on weekly_kpi_targets (user_id, week_key);
create index if not exists idx_weekly_kpi_targets_user_week_kpi on weekly_kpi_targets (user_id, week_key, kpi_id);

