alter table public.content_plans
  add column if not exists archived_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists content_plans_user_archive_idx
  on public.content_plans (user_id, archived_at, expires_at);
