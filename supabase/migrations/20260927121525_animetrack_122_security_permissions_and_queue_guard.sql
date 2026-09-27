-- AnimeTrack 12.2: applied on production as migration 20260927121525.
-- Client roles must not have bulk-DDL permissions: TRUNCATE is not protected by RLS.
revoke truncate, references, trigger on table public.anime_push_reminders from authenticated;
revoke truncate, references, trigger on table public.anime_push_subscriptions from authenticated;
-- Posting and reporting cannot set server-managed timestamps or moderation fields.
revoke insert on table public.episode_comments from authenticated;
grant insert (user_id, episode_key, author_name, body, is_spoiler, parent_id)
  on table public.episode_comments to authenticated;
revoke insert on table public.episode_comment_reports from authenticated;
grant insert (comment_id, reporter_id, reason)
  on table public.episode_comment_reports to authenticated;
create or replace function private.guard_animetrack_push_dispatch_fields()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if TG_OP = 'INSERT' then
      if new.claimed_at is not null or new.sent_at is not null then
        raise exception 'Push dispatch fields are server-managed' using errcode='42501';
      end if;
    elsif new.claimed_at is distinct from old.claimed_at
       or new.sent_at is distinct from old.sent_at then
      raise exception 'Push dispatch fields are server-managed' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_animetrack_push_dispatch_fields() from public, anon;
drop trigger if exists animetrack_push_dispatch_fields_guard on public.anime_push_reminders;
create trigger animetrack_push_dispatch_fields_guard
  before insert or update on public.anime_push_reminders
  for each row execute function private.guard_animetrack_push_dispatch_fields();
create index if not exists anime_friendships_requester_idx
  on public.anime_friendships (requester_id);
create index if not exists episode_comment_reports_reviewed_by_idx
  on public.episode_comment_reports (reviewed_by) where reviewed_by is not null;
