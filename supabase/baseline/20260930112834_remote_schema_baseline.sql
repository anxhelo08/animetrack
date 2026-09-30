-- AnimeTrack: catalogue-only snapshot of the live application schemas, 2026-09-30.

-- No user rows, auth/storage internals, credentials or migration-history changes.

-- Apply ONLY to an empty Supabase database (see README.md).

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE SCHEMA IF NOT EXISTS animetrack_private;

REVOKE ALL ON SCHEMA "private" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON SCHEMA "animetrack_private" FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA "public" TO PUBLIC;

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

GRANT USAGE ON SCHEMA "animetrack_private" TO "authenticated";

CREATE TABLE "public"."episode_comments" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "episode_key" text NOT NULL,
  "author_name" text NOT NULL,
  "body" text NOT NULL,
  "is_spoiler" boolean DEFAULT true NOT NULL,
  "is_hidden" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "parent_id" bigint
);

ALTER TABLE "public"."episode_comments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_libraries" (
  "user_id" uuid NOT NULL,
  "payload" jsonb DEFAULT '{"anime": [], "history": []}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."anime_libraries" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_moderators" (
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."anime_moderators" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."episode_comment_reports" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "comment_id" bigint NOT NULL,
  "reporter_id" uuid DEFAULT auth.uid() NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'open'::text NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid
);

ALTER TABLE "public"."episode_comment_reports" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_profiles" (
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "handle" text NOT NULL,
  "display_name" text NOT NULL,
  "bio" text DEFAULT ''::text NOT NULL,
  "avatar_emoji" text DEFAULT '🎌'::text NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "snapshot" jsonb DEFAULT '{"anime": [], "stats": {}}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "avatar_url" text DEFAULT ''::text NOT NULL
);

ALTER TABLE "public"."anime_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_friendships" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "requester_id" uuid DEFAULT auth.uid() NOT NULL,
  "recipient_id" uuid NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."anime_friendships" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_push_subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."anime_push_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."anime_push_reminders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "event_key" text NOT NULL,
  "anime_id" text NOT NULL,
  "season_id" text NOT NULL,
  "episode" integer NOT NULL,
  "title" text NOT NULL,
  "air_at" timestamp with time zone NOT NULL,
  "notify_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."anime_push_reminders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."anime_libraries" ADD CONSTRAINT "anime_libraries_payload_object" CHECK ((jsonb_typeof(payload) = 'object'::text));

ALTER TABLE public."anime_libraries" ADD CONSTRAINT "anime_libraries_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_episode_key_check" CHECK (((episode_key ~ '^(mal|al|tv):[0-9]+:[0-9]+$'::text) AND ((char_length(episode_key) >= 7) AND (char_length(episode_key) <= 90))));

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_author_name_check" CHECK (((char_length(btrim(author_name)) >= 1) AND (char_length(btrim(author_name)) <= 40)));

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_body_check" CHECK (((char_length(btrim(body)) >= 3) AND (char_length(btrim(body)) <= 1200)));

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_pkey" PRIMARY KEY (id);

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_reason_check" CHECK (((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 250)));

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_pkey" PRIMARY KEY (id);

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_comment_id_reporter_id_key" UNIQUE (comment_id, reporter_id);

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_handle_check" CHECK ((handle ~ '^[a-z0-9_]{3,24}$'::text));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_display_name_check" CHECK (((char_length(btrim(display_name)) >= 1) AND (char_length(btrim(display_name)) <= 40)));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_bio_check" CHECK ((char_length(bio) <= 280));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_avatar_emoji_check" CHECK ((char_length(avatar_emoji) <= 12));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_snapshot_check" CHECK (((jsonb_typeof(snapshot) = 'object'::text) AND (octet_length((snapshot)::text) < 170000)));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_handle_key" UNIQUE (handle);

ALTER TABLE public."anime_friendships" ADD CONSTRAINT "anime_friendships_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));

ALTER TABLE public."anime_friendships" ADD CONSTRAINT "anime_friendships_check" CHECK ((requester_id <> recipient_id));

ALTER TABLE public."anime_friendships" ADD CONSTRAINT "anime_friendships_pkey" PRIMARY KEY (id);

ALTER TABLE public."anime_moderators" ADD CONSTRAINT "anime_moderators_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'reviewed'::text, 'dismissed'::text])));

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_avatar_url_check" CHECK (((char_length(avatar_url) <= 500) AND ((avatar_url = ''::text) OR (avatar_url ~ '^https://'::text))));

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_endpoint_check" CHECK ((((char_length(endpoint) >= 25) AND (char_length(endpoint) <= 1024)) AND (endpoint ~ '^https://'::text)));

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_p256dh_check" CHECK (((char_length(p256dh) >= 32) AND (char_length(p256dh) <= 200)));

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_auth_key_check" CHECK (((char_length(auth_key) >= 8) AND (char_length(auth_key) <= 120)));

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_pkey" PRIMARY KEY (id);

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_user_id_endpoint_key" UNIQUE (user_id, endpoint);

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_event_key_check" CHECK (((char_length(event_key) >= 3) AND (char_length(event_key) <= 180)));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_anime_id_check" CHECK (((char_length(anime_id) >= 1) AND (char_length(anime_id) <= 90)));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_season_id_check" CHECK ((char_length(season_id) <= 90));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_episode_check" CHECK (((episode >= 1) AND (episode <= 10000)));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 140)));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_check" CHECK ((notify_at <= air_at));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_check1" CHECK ((notify_at >= (air_at - '1 day'::interval)));

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_pkey" PRIMARY KEY (id);

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_user_id_event_key_key" UNIQUE (user_id, event_key);

ALTER TABLE public."anime_libraries" ADD CONSTRAINT "anime_libraries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES episode_comments(id) ON DELETE CASCADE;

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."anime_profiles" ADD CONSTRAINT "anime_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."anime_friendships" ADD CONSTRAINT "anime_friendships_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."anime_friendships" ADD CONSTRAINT "anime_friendships_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."anime_moderators" ADD CONSTRAINT "anime_moderators_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."episode_comments" ADD CONSTRAINT "episode_comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES episode_comments(id) ON DELETE SET NULL;

ALTER TABLE public."episode_comment_reports" ADD CONSTRAINT "episode_comment_reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."anime_push_subscriptions" ADD CONSTRAINT "anime_push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."anime_push_reminders" ADD CONSTRAINT "anime_push_reminders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX anime_friendship_unique_active_pair ON public.anime_friendships USING btree (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id)) WHERE (status = ANY (ARRAY['pending'::text, 'accepted'::text]));

CREATE INDEX episode_comments_user_idx ON public.episode_comments USING btree (user_id);

CREATE INDEX episode_comments_episode_created_idx ON public.episode_comments USING btree (episode_key, created_at DESC);

CREATE UNIQUE INDEX anime_friendships_pair_idx ON public.anime_friendships USING btree (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));

CREATE INDEX episode_comment_reports_reviewed_by_idx ON public.episode_comment_reports USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);

CREATE INDEX anime_profiles_public_handle_idx ON public.anime_profiles USING btree (handle) WHERE is_public;

CREATE INDEX anime_push_reminders_user_idx ON public.anime_push_reminders USING btree (user_id);

CREATE INDEX anime_push_reminders_due_idx ON public.anime_push_reminders USING btree (notify_at) WHERE (sent_at IS NULL);

CREATE INDEX episode_comments_parent_idx ON public.episode_comments USING btree (parent_id) WHERE (parent_id IS NOT NULL);

CREATE INDEX anime_push_subscriptions_user_idx ON public.anime_push_subscriptions USING btree (user_id);

CREATE INDEX episode_comment_reports_reporter_idx ON public.episode_comment_reports USING btree (reporter_id);

CREATE INDEX anime_friendships_recipient_idx ON public.anime_friendships USING btree (recipient_id, status);

CREATE INDEX anime_friendships_requester_idx ON public.anime_friendships USING btree (requester_id);

CREATE OR REPLACE FUNCTION private.enforce_episode_comment_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if exists(select 1 from public.episode_comments c where c.user_id = new.user_id and c.created_at > now() - interval '15 seconds') then
  raise exception 'Prit 15 sekonda para komentit tjetër.' using errcode = 'P0001';
 end if;
 if (select count(*) from public.episode_comments c where c.user_id = new.user_id and c.created_at > now() - interval '1 day') >= 30 then
  raise exception 'U arrit kufiri prej 30 komentesh në 24 orë.' using errcode = 'P0001';
 end if;
 return new;
end;
$function$;

REVOKE ALL ON FUNCTION private.enforce_episode_comment_limits() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.enforce_episode_comment_limits() TO "authenticated";

CREATE OR REPLACE FUNCTION private.check_episode_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare parent_key text;
begin
 if new.parent_id is null then return new; end if;
 select episode_key into parent_key from public.episode_comments
 where id=new.parent_id and not is_hidden;
 if parent_key is null or parent_key<>new.episode_key then
  raise exception 'Përgjigjja duhet t’i përkasë të njëjtit episod.';
 end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION private.check_episode_reply() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_episode_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare parent_key text;
begin
 if new.parent_id is null then return new; end if;
 select c.episode_key into parent_key from public.episode_comments c
 where c.id=new.parent_id and c.is_hidden=false;
 if parent_key is null or parent_key<>new.episode_key then
  raise exception 'Replies must refer to a visible comment in the same episode.';
 end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION private.validate_episode_reply() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.validate_episode_reply() TO PUBLIC;

CREATE OR REPLACE FUNCTION private.guard_animetrack_push_dispatch_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION private.guard_animetrack_push_dispatch_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_animetrack_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.set_animetrack_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_animetrack_updated_at() TO "service_role";

CREATE OR REPLACE FUNCTION animetrack_private.find_friend_by_handle(p_handle text)
 RETURNS TABLE(user_id uuid, handle text, display_name text, avatar_emoji text, avatar_url text, is_public boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION animetrack_private.find_friend_by_handle(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION animetrack_private.find_friend_by_handle(text) TO "authenticated";

CREATE OR REPLACE FUNCTION public.anime_friendship_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.id is distinct from old.id or new.requester_id is distinct from old.requester_id
    or new.recipient_id is distinct from old.recipient_id or new.created_at is distinct from old.created_at
 then raise exception 'Friendship identity may not be modified' using errcode = '23514'; end if;
 if old.status <> 'pending' or new.status not in ('accepted','declined')
 then raise exception 'Invalid friendship status transition' using errcode = '23514'; end if;
 new.updated_at = now();
 return new;
end
$function$;

REVOKE ALL ON FUNCTION public.anime_friendship_update_guard() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.anime_friendship_update_guard() TO "authenticated";

GRANT EXECUTE ON FUNCTION public.anime_friendship_update_guard() TO "service_role";

CREATE OR REPLACE FUNCTION animetrack_private.request_friend_by_handle(p_handle text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION animetrack_private.request_friend_by_handle(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION animetrack_private.request_friend_by_handle(text) TO "authenticated";

CREATE OR REPLACE FUNCTION public.anime_find_friend_by_handle(p_handle text)
 RETURNS TABLE(user_id uuid, handle text, display_name text, avatar_emoji text, avatar_url text, is_public boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select * from animetrack_private.find_friend_by_handle(p_handle); $function$;

REVOKE ALL ON FUNCTION public.anime_find_friend_by_handle(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.anime_find_friend_by_handle(text) TO "authenticated";

GRANT EXECUTE ON FUNCTION public.anime_find_friend_by_handle(text) TO "service_role";

CREATE OR REPLACE FUNCTION public.anime_request_friend_by_handle(p_handle text)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select animetrack_private.request_friend_by_handle(p_handle); $function$;

REVOKE ALL ON FUNCTION public.anime_request_friend_by_handle(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.anime_request_friend_by_handle(text) TO "authenticated";

GRANT EXECUTE ON FUNCTION public.anime_request_friend_by_handle(text) TO "service_role";

CREATE TRIGGER animetrack_updated_at BEFORE UPDATE ON public.anime_libraries FOR EACH ROW EXECUTE FUNCTION set_animetrack_updated_at();

CREATE TRIGGER episode_comments_insert_limit BEFORE INSERT ON public.episode_comments FOR EACH ROW EXECUTE FUNCTION private.enforce_episode_comment_limits();

CREATE TRIGGER validate_episode_reply BEFORE INSERT ON public.episode_comments FOR EACH ROW EXECUTE FUNCTION private.check_episode_reply();

CREATE TRIGGER episode_comment_same_episode BEFORE INSERT ON public.episode_comments FOR EACH ROW EXECUTE FUNCTION private.validate_episode_reply();

CREATE TRIGGER anime_friendship_immutable_update BEFORE UPDATE ON public.anime_friendships FOR EACH ROW EXECUTE FUNCTION anime_friendship_update_guard();

CREATE TRIGGER animetrack_push_dispatch_fields_guard BEFORE INSERT OR UPDATE ON public.anime_push_reminders FOR EACH ROW EXECUTE FUNCTION private.guard_animetrack_push_dispatch_fields();

CREATE POLICY "Users read their own anime library" ON "public"."anime_libraries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users insert their own anime library" ON "public"."anime_libraries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update their own anime library" ON "public"."anime_libraries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users delete their own anime library" ON "public"."anime_libraries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Signed in members view visible episode comments" ON "public"."episode_comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((NOT is_hidden) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Members create only their own episode comments" ON "public"."episode_comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (is_hidden = false)));

CREATE POLICY "Members delete only their own episode comments" ON "public"."episode_comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Members see their own reports" ON "public"."episode_comment_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((reporter_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Members report with own ID" ON "public"."episode_comment_reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((reporter_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Members edit only their own episode comments" ON "public"."episode_comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) AND (is_hidden = false))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (is_hidden = false)));

CREATE POLICY "Participants see their friend connections" ON "public"."anime_friendships" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Members request visible profiles" ON "public"."anime_friendships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((requester_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM anime_profiles p
  WHERE ((p.user_id = anime_friendships.recipient_id) AND p.is_public)))));

CREATE POLICY "Recipients respond to requests" ON "public"."anime_friendships" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))) WITH CHECK (((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text]))));

CREATE POLICY "Participants remove connections" ON "public"."anime_friendships" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Public or accepted friends see profiles" ON "public"."anime_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR is_public OR (EXISTS ( SELECT 1
   FROM anime_friendships f
  WHERE ((f.status = 'accepted'::text) AND (((f.requester_id = anime_profiles.user_id) AND (f.recipient_id = ( SELECT auth.uid() AS uid))) OR ((f.recipient_id = anime_profiles.user_id) AND (f.requester_id = ( SELECT auth.uid() AS uid)))))))));

CREATE POLICY "Members create own profiles" ON "public"."anime_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Members update own profiles" ON "public"."anime_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Members delete own profiles" ON "public"."anime_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators see own membership" ON "public"."anime_moderators" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators read reports" ON "public"."episode_comment_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Moderators review reports" ON "public"."episode_comment_reports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Moderators see hidden comments" ON "public"."episode_comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Moderators manage reported comments" ON "public"."episode_comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM anime_moderators m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "push subscriptions: own read" ON "public"."anime_push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push subscriptions: own insert" ON "public"."anime_push_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push subscriptions: own update" ON "public"."anime_push_subscriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push subscriptions: own delete" ON "public"."anime_push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push reminders: own read" ON "public"."anime_push_reminders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push reminders: own insert" ON "public"."anime_push_reminders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push reminders: own update" ON "public"."anime_push_reminders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "push reminders: own delete" ON "public"."anime_push_reminders" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

REVOKE ALL ON TABLE "public"."episode_comments" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_libraries" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_moderators" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."episode_comment_reports" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_profiles" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_friendships" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_push_subscriptions" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE "public"."anime_push_reminders" FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE "public"."episode_comments" TO "authenticated";

GRANT DELETE ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ON TABLE "public"."anime_libraries" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_libraries" TO "authenticated";

GRANT UPDATE ON TABLE "public"."anime_libraries" TO "authenticated";

GRANT DELETE ON TABLE "public"."anime_libraries" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_moderators" TO "authenticated";

GRANT SELECT ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT INSERT ON TABLE "public"."anime_profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."anime_profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."anime_profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."anime_friendships" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_friendships" TO "authenticated";

GRANT UPDATE ON TABLE "public"."anime_friendships" TO "authenticated";

GRANT DELETE ON TABLE "public"."anime_friendships" TO "authenticated";

GRANT INSERT ON TABLE "public"."anime_push_subscriptions" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_push_subscriptions" TO "authenticated";

GRANT UPDATE ON TABLE "public"."anime_push_subscriptions" TO "authenticated";

GRANT DELETE ON TABLE "public"."anime_push_subscriptions" TO "authenticated";

GRANT INSERT ON TABLE "public"."anime_push_reminders" TO "authenticated";

GRANT SELECT ON TABLE "public"."anime_push_reminders" TO "authenticated";

GRANT UPDATE ON TABLE "public"."anime_push_reminders" TO "authenticated";

GRANT DELETE ON TABLE "public"."anime_push_reminders" TO "authenticated";

GRANT INSERT ON TABLE "public"."episode_comments" TO "service_role";

GRANT SELECT ON TABLE "public"."episode_comments" TO "service_role";

GRANT UPDATE ON TABLE "public"."episode_comments" TO "service_role";

GRANT DELETE ON TABLE "public"."episode_comments" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."episode_comments" TO "service_role";

GRANT REFERENCES ON TABLE "public"."episode_comments" TO "service_role";

GRANT TRIGGER ON TABLE "public"."episode_comments" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_libraries" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_libraries" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_libraries" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_libraries" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_libraries" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_libraries" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_libraries" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_moderators" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_moderators" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_moderators" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_moderators" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_moderators" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_moderators" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_moderators" TO "service_role";

GRANT INSERT ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT SELECT ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT UPDATE ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT DELETE ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT REFERENCES ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT TRIGGER ON TABLE "public"."episode_comment_reports" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_profiles" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_friendships" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_friendships" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_friendships" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_friendships" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_friendships" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_friendships" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_friendships" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_push_subscriptions" TO "service_role";

GRANT INSERT ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT SELECT ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT UPDATE ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT DELETE ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT REFERENCES ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT TRIGGER ON TABLE "public"."anime_push_reminders" TO "service_role";

GRANT INSERT ("author_name") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ("body") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT UPDATE ("body") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ("comment_id") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT INSERT ("episode_key") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT UPDATE ("is_hidden") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ("is_spoiler") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT UPDATE ("is_spoiler") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ("parent_id") ON TABLE "public"."episode_comments" TO "authenticated";

GRANT INSERT ("reason") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT INSERT ("reporter_id") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT UPDATE ("reviewed_at") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT UPDATE ("reviewed_by") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."episode_comment_reports" TO "authenticated";

GRANT INSERT ("user_id") ON TABLE "public"."episode_comments" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."episode_comments_id_seq" FROM PUBLIC, anon, authenticated;

GRANT SELECT ON SEQUENCE "public"."episode_comments_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE "public"."episode_comments_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE "public"."episode_comments_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE "public"."episode_comments_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."episode_comments_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."episode_comments_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."episode_comments_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE "public"."episode_comments_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."episode_comments_id_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."episode_comment_reports_id_seq" FROM PUBLIC, anon, authenticated;

GRANT SELECT ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."episode_comment_reports_id_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."anime_friendships_id_seq" FROM PUBLIC, anon, authenticated;

GRANT SELECT ON SEQUENCE "public"."anime_friendships_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE "public"."anime_friendships_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE "public"."anime_friendships_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE "public"."anime_friendships_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."anime_friendships_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."anime_friendships_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."anime_friendships_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE "public"."anime_friendships_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."anime_friendships_id_seq" TO "service_role";

COMMIT;

