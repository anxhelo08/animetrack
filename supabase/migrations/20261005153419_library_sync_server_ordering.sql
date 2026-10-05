-- Server revisions are CAS tokens, never client timestamps. Cover INSERT too.
create or replace function public.set_animetrack_library_updated_at()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.set_animetrack_library_updated_at() from public, anon, authenticated;
grant execute on function public.set_animetrack_library_updated_at() to service_role;
drop trigger if exists animetrack_updated_at on public.anime_libraries;
create trigger animetrack_updated_at before insert or update on public.anime_libraries
for each row execute function public.set_animetrack_library_updated_at();

-- A fresh server reading, not the potentially months-old row updated_at.
create or replace function public.animetrack_server_time()
returns timestamptz language sql volatile security invoker set search_path = pg_catalog as $$
  select clock_timestamp();
$$;
revoke all on function public.animetrack_server_time() from public, anon;
grant execute on function public.animetrack_server_time() to authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'anime_libraries') then
    alter publication supabase_realtime add table public.anime_libraries;
  end if;
end;
$$;
