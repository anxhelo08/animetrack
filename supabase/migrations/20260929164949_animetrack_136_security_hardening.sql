-- AnimeTrack 13.6 security hardening.
-- Production-applied migration: 20260929164949.
-- RLS remains the row boundary; anonymous table access is explicitly revoked.

alter table public.anime_profiles enable row level security;
alter table public.anime_friendships enable row level security;
alter table public.anime_push_reminders enable row level security;
alter table public.anime_push_subscriptions enable row level security;

revoke all on table public.anime_profiles from anon;
revoke all on table public.anime_friendships from anon;
revoke all on table public.anime_push_reminders from anon;
revoke all on table public.anime_push_subscriptions from anon;

grant select, insert, update, delete on table public.anime_profiles to authenticated;
grant select, insert, update, delete on table public.anime_friendships to authenticated;
grant select, insert, update, delete on table public.anime_push_reminders to authenticated;
grant select, insert, update, delete on table public.anime_push_subscriptions to authenticated;

create or replace function animetrack_private.find_friend_by_handle(p_handle text)
returns table(
  user_id uuid,
  handle text,
  display_name text,
  avatar_emoji text,
  avatar_url text,
  is_public boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  normalized_handle text := lower(btrim(p_handle));
begin
  if me is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if normalized_handle !~ '^[a-z0-9_]{3,24}$' then
    return;
  end if;

  return query
  select p.user_id, p.handle, p.display_name, p.avatar_emoji, p.avatar_url, p.is_public
  from public.anime_profiles as p
  where p.handle = normalized_handle
  limit 1;
end;
$$;

revoke all on function animetrack_private.find_friend_by_handle(text) from public;
revoke all on function animetrack_private.find_friend_by_handle(text) from anon;
grant execute on function animetrack_private.find_friend_by_handle(text) to authenticated;

revoke all on function animetrack_private.request_friend_by_handle(text) from public;
revoke all on function animetrack_private.request_friend_by_handle(text) from anon;
grant execute on function animetrack_private.request_friend_by_handle(text) to authenticated;

revoke all on function public.anime_find_friend_by_handle(text) from public;
revoke all on function public.anime_find_friend_by_handle(text) from anon;
grant execute on function public.anime_find_friend_by_handle(text) to authenticated;

revoke all on function public.anime_request_friend_by_handle(text) from public;
revoke all on function public.anime_request_friend_by_handle(text) from anon;
grant execute on function public.anime_request_friend_by_handle(text) to authenticated;
