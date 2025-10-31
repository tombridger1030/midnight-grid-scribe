-- Add weight to user_kpis for weighted completion

alter table if exists user_kpis
  add column if not exists weight decimal not null default 1;

-- Optional: backfill nulls to 1 if any
do $$
begin
  if to_regclass('public.user_kpis') is not null then
    update user_kpis set weight = 1 where weight is null;
  end if;
end $$;
