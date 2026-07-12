create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  role text not null,
  stage text not null,
  source text not null default 'manual',
  location text,
  compensation text,
  next_action text,
  follow_up_due_at timestamptz,
  match_score integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities
  add column if not exists source_account_id text,
  add column if not exists source_job_id text,
  add column if not exists fingerprint text,
  add column if not exists last_source_sync_at timestamptz,
  add column if not exists attachments jsonb not null default '[]'::jsonb;

delete from public.opportunities older
using public.opportunities newer
where older.fingerprint is not null
  and older.user_id = newer.user_id
  and older.fingerprint = newer.fingerprint
  and (older.updated_at, older.created_at, older.id) < (newer.updated_at, newer.created_at, newer.id);

drop index if exists public.opportunities_user_fingerprint_idx;

create unique index if not exists opportunities_user_fingerprint_idx
  on public.opportunities(user_id, fingerprint);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  company text not null,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30,
  format text not null default 'video',
  created_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'attention')),
  sync_method text not null default 'manual_import' check (sync_method in ('official_api', 'email_fallback', 'manual_import')),
  external_account_id text,
  token_reference text,
  scopes text[] not null default '{}',
  imported_count integer not null default 0,
  last_synced_at timestamptz,
  sync_state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  status text not null default 'queued' check (status in ('queued', 'normalizing', 'completed', 'failed')),
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  mapped_fields text[] not null default '{}',
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.source_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  event_type text not null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.activity_events enable row level security;
alter table public.interviews enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.sync_runs enable row level security;
alter table public.source_events enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users own opportunities" on public.opportunities;
create policy "Users own opportunities"
  on public.opportunities for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users own interviews" on public.interviews;
create policy "Users own interviews"
  on public.interviews for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own activity" on public.activity_events;
create policy "Users can insert own activity"
  on public.activity_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own activity and admins read all" on public.activity_events;
create policy "Users can read own activity and admins read all"
  on public.activity_events for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users own connected accounts" on public.connected_accounts;
create policy "Users own connected accounts"
  on public.connected_accounts for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users own sync runs" on public.sync_runs;
create policy "Users own sync runs"
  on public.sync_runs for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users own source events" on public.source_events;
create policy "Users own source events"
  on public.source_events for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create or replace view public.admin_analytics as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where last_login_at > now() - interval '7 days') as active_users_7d,
  (select count(*) from public.opportunities) as total_opportunities,
  (select count(*) from public.interviews) as total_interviews,
  (select count(*) from public.activity_events) as total_activity_events,
  (select count(*) from public.connected_accounts where status = 'connected') as total_connected_accounts,
  (select count(*) from public.sync_runs) as total_sync_runs;
