-- Cash Console storage (single row per user)
create table if not exists cash_console (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create or replace function set_updated_at_cash_console()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists trg_cash_console_set_updated_at on cash_console;
create trigger trg_cash_console_set_updated_at
before update on cash_console
for each row execute function set_updated_at_cash_console();


