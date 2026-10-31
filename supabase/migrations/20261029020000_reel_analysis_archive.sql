-- Persistent Reel DNA analysis archive.
-- Keep only the newest analysis for each video before enforcing one row per Reel.

delete from public.reel_analyses older
using public.reel_analyses newer
where older.reel_id = newer.reel_id
  and (
    older.created_at < newer.created_at
    or (
      older.created_at = newer.created_at
      and older.id < newer.id
    )
  );

create unique index if not exists reel_analyses_reel_id_uidx
  on public.reel_analyses (reel_id);

drop policy if exists "Users can insert own analyses"
  on public.reel_analyses;

create policy "Users can insert own analyses"
on public.reel_analyses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own analyses"
  on public.reel_analyses;

create policy "Users can update own analyses"
on public.reel_analyses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.reel_analyses from anon, authenticated;
grant select, insert, update on public.reel_analyses to authenticated;
