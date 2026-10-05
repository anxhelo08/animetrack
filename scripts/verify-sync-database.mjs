import assert from 'node:assert/strict';
export const syncVerificationSQL = `
begin;
create temporary table sync_clock_fixture (like public.anime_libraries including defaults);
create trigger fixture_updated_at before insert or update on sync_clock_fixture
for each row execute function public.set_animetrack_library_updated_at();
do $$
declare stamp timestamptz;
begin
 insert into sync_clock_fixture(user_id,payload,updated_at) values(gen_random_uuid(),'{"anime":[]}',now()+interval '10 minutes') returning updated_at into stamp;
 if abs(extract(epoch from (stamp-clock_timestamp())))>2 then raise exception 'INSERT accepted a phone timestamp'; end if;
 update sync_clock_fixture set updated_at=now()-interval '10 minutes' returning updated_at into stamp;
 if abs(extract(epoch from (stamp-clock_timestamp())))>2 then raise exception 'UPDATE accepted a phone timestamp'; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='anime_libraries') then raise exception 'Realtime membership missing'; end if;
 if has_function_privilege('anon','public.animetrack_server_time()','execute') then raise exception 'Anonymous clock access'; end if;
 if not has_function_privilege('authenticated','public.animetrack_server_time()','execute') then raise exception 'Authenticated clock unavailable'; end if;
 if abs(extract(epoch from (public.animetrack_server_time()-clock_timestamp())))>2 then raise exception 'RPC clock incorrect'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.anime_libraries'::regclass and tgname='animetrack_updated_at' and (tgtype::integer & 4)=4 and (tgtype::integer & 16)=16) then raise exception 'Library INSERT/UPDATE trigger missing'; end if;
end; $$;
select 'sync server clock, permissions and publication verified' as verification;
rollback;`;
export async function verifySyncDatabase(db) {
  const results = await db.query(syncVerificationSQL);
  assert(results.some((result) => result.rows?.some((row) => row.verification)));
}
