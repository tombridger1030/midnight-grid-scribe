-- Content tracking schema

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  platform text not null check (platform in ('youtube','tiktok','instagram')),
  format text not null check (format in ('long_form','short')),
  account_handle text,
  title text not null,
  caption text,
  script text,
  primary_hook text,
  published_at date not null,
  video_length_seconds integer,
  url text,
  platform_video_id text,
  roadmap_id text,
  kanban_task_id text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_items_user on content_items(user_id);
create index if not exists idx_content_items_published_at on content_items(published_at);
create index if not exists idx_content_items_platform on content_items(platform);

create table if not exists content_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content_id uuid not null references content_items(id) on delete cascade,
  snapshot_date date not null default (now()::date),
  views integer default 0,
  shares integer default 0,
  saves integer default 0,
  follows integer default 0,
  average_watch_time_seconds numeric,
  retention_ratio numeric,
  shares_per_view numeric,
  saves_per_view numeric,
  followers_per_reach numeric,
  non_follower_reach_ratio numeric,
  reach integer,
  likes integer,
  comments integer,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_metrics_user on content_metrics(user_id);
create index if not exists idx_content_metrics_content on content_metrics(content_id);
create index if not exists idx_content_metrics_snapshot on content_metrics(snapshot_date);

-- trigger to keep updated_at fresh
create or replace function set_updated_at_content_items()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists trg_content_items_set_updated_at on content_items;
create trigger trg_content_items_set_updated_at
before update on content_items
for each row execute function set_updated_at_content_items();


