-- Enable Row Level Security on cash_console table
alter table cash_console enable row level security;

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

