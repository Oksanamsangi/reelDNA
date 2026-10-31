create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  expiry_date bigint,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

create policy "Users can manage their own Google Calendar connection"
on public.google_calendar_connections
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.google_calendar_connections from anon, authenticated;
grant select, insert, update, delete
on public.google_calendar_connections to authenticated;
