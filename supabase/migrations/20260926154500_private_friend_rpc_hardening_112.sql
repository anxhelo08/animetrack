-- AnimeTrack 11.2 security hardening.
-- Move privileged exact-handle lookup and invite implementation out of the exposed public API schema.
-- Preserve the public RPC names and their minimal, authenticated-only contracts.
-- No user, library or friendship data is modified.
create schema if not exists animetrack_private;
revoke all on schema animetrack_private from public, anon;
grant usage on schema animetrack_private to authenticated;

create or replace function animetrack_private.find_friend_by_handle(p_handle text)
returns table (user_id uuid, handle text, display_name text, avatar_emoji text, avatar_url text, is_public boolean)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, p.handle, p.display_name, p.avatar_emoji, p.avatar_url, p.is_public
  from public.anime_profiles as p
  where (select auth.uid()) is not null
    and p.handle = lower(btrim(p_handle))
    and p.handle ~ '^[a-z0-9_]{3,24}$'
  limit 1;
$$;
revoke all on function animetrack_private.find_friend_by_handle(text) from public, anon;
grant execute on function animetrack_private.find_friend_by_handle(text) to authenticated;

create or replace function animetrack_private.request_friend_by_handle(p_handle text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target_id uuid;
  old_status text;
begin
  if me is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_handle is null or btrim(p_handle) !~ '^[a-zA-Z0-9_]{3,24}$' then return 'invalid'; end if;
  select p.user_id into target_id from public.anime_profiles p where p.handle = lower(btrim(p_handle));
  if target_id is null then return 'not-found'; end if;
  if target_id = me then return 'self'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(least(me::text,target_id::text)),
    pg_catalog.hashtext(greatest(me::text,target_id::text))
  );
  select f.status into old_status from public.anime_friendships f
  where (f.requester_id = me and f.recipient_id = target_id)
     or (f.requester_id = target_id and f.recipient_id = me)
  order by case when f.status='accepted' then 0 when f.status='pending' then 1 else 2 end, f.created_at desc
  limit 1;
  if old_status='accepted' then return 'already-friends'; end if;
  if old_status='pending' then return 'pending'; end if;
  if old_status='declined' then return 'declined'; end if;
  if (select count(*) from public.anime_friendships where requester_id=me and status='pending')>=50 then return 'limit'; end if;
  insert into public.anime_friendships(requester_id,recipient_id,status) values (me,target_id,'pending');
  return 'sent';
end;
$$;
revoke all on function animetrack_private.request_friend_by_handle(text) from public, anon;
grant execute on function animetrack_private.request_friend_by_handle(text) to authenticated;

create or replace function public.anime_find_friend_by_handle(p_handle text)
returns table (user_id uuid, handle text, display_name text, avatar_emoji text, avatar_url text, is_public boolean)
language sql stable security invoker set search_path = ''
as $$ select * from animetrack_private.find_friend_by_handle(p_handle); $$;
revoke all on function public.anime_find_friend_by_handle(text) from public, anon;
grant execute on function public.anime_find_friend_by_handle(text) to authenticated;

create or replace function public.anime_request_friend_by_handle(p_handle text)
returns text
language sql volatile security invoker set search_path = ''
as $$ select animetrack_private.request_friend_by_handle(p_handle); $$;
revoke all on function public.anime_request_friend_by_handle(text) from public, anon;
grant execute on function public.anime_request_friend_by_handle(text) to authenticated;
