create table public.brand_intelligence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_handle text not null,
  profile_data jsonb not null default '{}'::jsonb,
  audit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_intelligence_user_handle_unique
    unique (user_id, profile_handle)
);

create index brand_intelligence_user_updated_idx
  on public.brand_intelligence (user_id, updated_at desc);

alter table public.brand_intelligence enable row level security;

create policy "Users can read own brand intelligence"
  on public.brand_intelligence for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own brand intelligence"
  on public.brand_intelligence for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own brand intelligence"
  on public.brand_intelligence for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own brand intelligence"
  on public.brand_intelligence for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.brand_intelligence to authenticated;
