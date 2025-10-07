-- =====================================================
-- CASH CONSOLE: Complete Setup (Table + RLS Policies)
-- =====================================================
-- This creates the cash_console table and adds Row Level Security
-- Run this in your Supabase SQL Editor

-- Step 1: Create the cash_console table
-- =====================================================
create table if not exists cash_console (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Create function to auto-update the updated_at timestamp
create or replace function set_updated_at_cash_console()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

-- Create trigger to call the function on updates
drop trigger if exists trg_cash_console_set_updated_at on cash_console;
create trigger trg_cash_console_set_updated_at
before update on cash_console
for each row execute function set_updated_at_cash_console();

-- Step 2: Enable Row Level Security
-- =====================================================
alter table cash_console enable row level security;

-- Drop existing policies if they exist (for re-running this script)
drop policy if exists "Users can view own cash console data" on cash_console;
drop policy if exists "Users can insert own cash console data" on cash_console;
drop policy if exists "Users can update own cash console data" on cash_console;
drop policy if exists "Users can delete own cash console data" on cash_console;

-- Policy: Users can only view their own cash console data
create policy "Users can view own cash console data"
  on cash_console
  for select
  using (auth.uid()::text = user_id);

-- Policy: Users can insert their own cash console data
create policy "Users can insert own cash console data"
  on cash_console
  for insert
  with check (auth.uid()::text = user_id);

-- Policy: Users can update their own cash console data
create policy "Users can update own cash console data"
  on cash_console
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Policy: Users can delete their own cash console data
create policy "Users can delete own cash console data"
  on cash_console
  for delete
  using (auth.uid()::text = user_id);

-- Step 3: Create index for performance
-- =====================================================
create index if not exists idx_cash_console_user_id on cash_console(user_id);

-- =====================================================
-- Verification Queries (Optional - run after setup)
-- =====================================================
-- Check if table was created:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'cash_console';

-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'cash_console';

-- Check policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'cash_console';

