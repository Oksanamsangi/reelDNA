-- REEL DNA: initial database schema

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  original_filename text,
  storage_path text,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reel_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.reels(id) on delete cascade,
  analysis jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.content_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My content plan',
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;
alter table public.reels enable row level security;
alter table public.reel_analyses enable row level security;
alter table public.content_plans enable row level security;

-- User profiles: users can read and update their own profile
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Reels: users can manage their own videos
create policy "Users can manage own reels"
on public.reels
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Analyses: users can read their own analysis results
create policy "Users can read own analyses"
on public.reel_analyses
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Content plans: users can manage their own plans
create policy "Users can manage own content plans"
on public.content_plans
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Explicit table privileges
revoke all on public.user_profiles from anon, authenticated;
revoke all on public.reels from anon, authenticated;
revoke all on public.reel_analyses from anon, authenticated;
revoke all on public.content_plans from anon, authenticated;

grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.reels to authenticated;
grant select on public.reel_analyses to authenticated;
grant select, insert, update, delete on public.content_plans to authenticated;
