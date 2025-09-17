-- Migration: KPI Definitions with Updated Colors
-- This migration creates a KPI definitions table and seeds it with updated color schemes
-- for better visualization in the dashboard and charts.

-- Create KPI definitions table for future extensibility
create table if not exists kpi_definitions (
  id text primary key,
  name text not null,
  target numeric not null,
  min_target numeric,
  unit text not null,
  category text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger function to update updated_at
create or replace function set_updated_at_kpi_definitions()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

-- Create trigger for auto-updating updated_at
drop trigger if exists trg_kpi_definitions_set_updated_at on kpi_definitions;
create trigger trg_kpi_definitions_set_updated_at
before update on kpi_definitions
for each row execute function set_updated_at_kpi_definitions();

-- Clear any existing data and insert updated KPI definitions with new colors
truncate table kpi_definitions;

insert into kpi_definitions (id, name, target, min_target, unit, category, color) values
  ('strengthSessions', 'Strength Sessions', 3, 2, 'sessions', 'fitness', '#FF6B00'),
  ('bjjSessions', 'BJJ Sessions', 3, null, 'sessions', 'fitness', '#53B4FF'),
  ('deepWorkHours', 'Deep Work Hours', 30, 20, 'hours', 'discipline', '#5FE3B3'),
  ('recoverySessions', 'Recovery Sessions', 5, 3, 'sessions', 'fitness', '#FFD700'),
  ('sleepAverage', 'Sleep Average', 7, 6, 'hours', 'discipline', '#9D4EDD'),
  ('prRequests', 'PR Requests', 2, null, 'requests', 'engineering', '#4A90E2'),
  ('bugsClosed', 'Bugs Closed', 10, null, 'bugs', 'engineering', '#FF6B6B'),
  ('contentShipped', 'Content Shipped', 7, null, 'items', 'engineering', '#00CED1'),
  ('readingPages', 'Pages Read', 100, null, 'pages', 'learning', '#FFA500'),
  ('audiobookPercent', '% Audiobook Listened', 100, null, '%', 'learning', '#DA70D6'),
  ('noCompromises', 'No Compromises', 7, null, 'days', 'discipline', '#32CD32');

-- Add comment explaining the color changes
comment on table kpi_definitions is 'KPI definitions with updated distinct colors for better chart visualization. Previously all KPIs used #FF6B00 orange, now each has a unique color for line charts in the Visualizer.';

-- Create index for performance
create index if not exists idx_kpi_definitions_category on kpi_definitions(category);

-- Optional: Create a view for easy querying
create or replace view kpi_definitions_by_category as
select
  category,
  json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'target', target,
      'minTarget', min_target,
      'unit', unit,
      'color', color
    ) order by name
  ) as kpis
from kpi_definitions
group by category;

-- Add RLS (Row Level Security) policies if needed in future
-- alter table kpi_definitions enable row level security;