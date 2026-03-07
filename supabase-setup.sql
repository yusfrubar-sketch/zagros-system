-- Run this in Supabase Dashboard → SQL Editor
-- 1. Server time (so 7-day trial uses server clock, not user's PC)
create or replace function public.get_server_time()
returns json
language sql
security definer
as $$
  select json_build_object('now', now()::text);
$$;

grant execute on function public.get_server_time() to anon;
grant execute on function public.get_server_time() to authenticated;

-- 2. Trials: one row per machine, trial_ends_at from server time
create table if not exists public.trials (
  machine_id text primary key,
  trial_ends_at timestamptz not null
);

-- 3. License activations: key_hash (SHA256 of password), machine_id after first use
create table if not exists public.license_activations (
  key_hash text primary key,
  machine_id text,
  activated_at timestamptz
);

alter table public.trials enable row level security;
alter table public.license_activations enable row level security;

-- Anon (Zagros app): can upsert trials, select trials, select/update license_activations (cannot insert)
create policy "trials_all" on public.trials for all using (true) with check (true);
create policy "license_select" on public.license_activations for select using (true);
create policy "license_update_unused" on public.license_activations for update
  using (true) with check (true);

-- Note: INSERT into license_activations is only allowed via service_role (your admin website).
-- The Zagros app (anon) cannot create new keys; only your admin site can.
