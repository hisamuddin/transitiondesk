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

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.activity_events enable row level security;
alter table public.interviews enable row level security;

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

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can upsert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "Users own opportunities"
  on public.opportunities for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users own interviews"
  on public.interviews for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own activity"
  on public.activity_events for insert
  with check (auth.uid() = user_id);

create policy "Users can read own activity and admins read all"
  on public.activity_events for select
  using (auth.uid() = user_id or public.is_admin());

create or replace view public.admin_analytics as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where last_login_at > now() - interval '7 days') as active_users_7d,
  (select count(*) from public.opportunities) as total_opportunities,
  (select count(*) from public.interviews) as total_interviews,
  (select count(*) from public.activity_events) as total_activity_events;
