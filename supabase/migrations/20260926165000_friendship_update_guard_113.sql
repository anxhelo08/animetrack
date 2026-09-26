-- AnimeTrack 11.3: keep identities immutable on accepted/declined updates.
-- Existing friendships and libraries are not modified.
create or replace function public.anime_friendship_update_guard()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
 if new.id is distinct from old.id or new.requester_id is distinct from old.requester_id
    or new.recipient_id is distinct from old.recipient_id or new.created_at is distinct from old.created_at
 then raise exception 'Friendship identity may not be modified' using errcode = '23514'; end if;
 if old.status <> 'pending' or new.status not in ('accepted','declined')
 then raise exception 'Invalid friendship status transition' using errcode = '23514'; end if;
 new.updated_at = now();
 return new;
end
$$;
revoke all on function public.anime_friendship_update_guard() from public, anon;
grant execute on function public.anime_friendship_update_guard() to authenticated;
drop trigger if exists anime_friendship_immutable_update on public.anime_friendships;
create trigger anime_friendship_immutable_update
before update on public.anime_friendships
for each row execute function public.anime_friendship_update_guard();
create unique index if not exists anime_friendship_unique_active_pair
on public.anime_friendships (least(requester_id,recipient_id), greatest(requester_id,recipient_id))
where status in ('pending','accepted');
