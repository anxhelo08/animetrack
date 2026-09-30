-- 13.9: additive server controls. The standalone baseline is never applied to production.
BEGIN;
CREATE TABLE animetrack_private.rate_buckets (
  scope text NOT NULL, subject text NOT NULL, window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0), PRIMARY KEY (scope, subject)
);
CREATE INDEX rate_buckets_expiry ON animetrack_private.rate_buckets(window_start);
ALTER TABLE animetrack_private.rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON animetrack_private.rate_buckets FROM PUBLIC, anon, authenticated;

CREATE FUNCTION animetrack_private.consume_budget(p_scope text, p_subject text, p_limit integer, p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE started timestamptz := pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.clock_timestamp()) / p_seconds) * p_seconds); used integer;
BEGIN
  INSERT INTO animetrack_private.rate_buckets AS b(scope,subject,window_start,attempts)
  VALUES(p_scope,p_subject,started,1)
  ON CONFLICT(scope,subject) DO UPDATE SET window_start=excluded.window_start,
    attempts=CASE WHEN b.window_start=excluded.window_start THEN least(b.attempts+1,p_limit+1) ELSE 1 END
  RETURNING attempts INTO used;
  -- Bound storage; only fixed application scopes can call this private primitive.
  DELETE FROM animetrack_private.rate_buckets WHERE window_start < pg_catalog.now()-interval '2 days';
  RETURN used <= p_limit;
END $$;
REVOKE ALL ON FUNCTION animetrack_private.consume_budget(text,text,integer,integer) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION animetrack_private.require_account() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=me) THEN
    RAISE EXCEPTION 'Authentication required' USING errcode='42501';
  END IF;
  RETURN me;
END $$;
REVOKE ALL ON FUNCTION animetrack_private.require_account() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION animetrack_private.find_friend_by_handle(p_handle text)
RETURNS TABLE(user_id uuid,handle text,display_name text,avatar_emoji text,avatar_url text,is_public boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := animetrack_private.require_account(); normalized text := lower(btrim(p_handle));
BEGIN
  IF NOT animetrack_private.consume_budget('friend-lookup',me::text,15,60) THEN
    RAISE EXCEPTION 'Try again later' USING errcode='P0001';
  END IF;
  IF normalized IS NULL OR normalized !~ '^[a-z0-9_]{3,24}$' THEN RETURN; END IF;
  RETURN QUERY SELECT p.user_id,p.handle,p.display_name,p.avatar_emoji,p.avatar_url,p.is_public
    FROM public.anime_profiles p WHERE p.handle=normalized LIMIT 1;
END $$;
CREATE OR REPLACE FUNCTION public.anime_find_friend_by_handle(p_handle text)
RETURNS TABLE(user_id uuid,handle text,display_name text,avatar_emoji text,avatar_url text,is_public boolean)
LANGUAGE sql VOLATILE SET search_path = '' AS $$ SELECT * FROM animetrack_private.find_friend_by_handle(p_handle); $$;

CREATE OR REPLACE FUNCTION animetrack_private.request_friend_by_handle(p_handle text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := animetrack_private.require_account(); target_id uuid;
BEGIN
  IF NOT animetrack_private.consume_budget('friend-request',me::text,10,60) THEN RETURN 'limit'; END IF;
  -- Every eligible/unknown/declined/already-existing target has the same response.
  IF p_handle IS NULL OR btrim(p_handle) !~ '^[a-zA-Z0-9_]{3,24}$' THEN RETURN 'received'; END IF;
  SELECT p.user_id INTO target_id FROM public.anime_profiles p WHERE p.handle=lower(btrim(p_handle));
  IF target_id IS NULL OR target_id=me THEN RETURN 'received'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(least(me::text,target_id::text)),pg_catalog.hashtext(greatest(me::text,target_id::text)));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('friend-insert'),pg_catalog.hashtext(me::text));
  IF EXISTS(SELECT 1 FROM public.anime_friendships f WHERE
    (f.requester_id=me AND f.recipient_id=target_id) OR (f.requester_id=target_id AND f.recipient_id=me)) THEN RETURN 'received'; END IF;
  IF (SELECT count(*) FROM public.anime_friendships WHERE requester_id=me AND status='pending')>=50 THEN RETURN 'received'; END IF;
  INSERT INTO public.anime_friendships(requester_id,recipient_id,status) VALUES(me,target_id,'pending');
  RETURN 'received';
END $$;

CREATE FUNCTION animetrack_private.friend_insert_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  -- Authenticated direct table writes must not bypass the RPC throttle or refusals.
  IF me IS NOT NULL THEN
    PERFORM animetrack_private.require_account();
    IF new.requester_id<>me OR new.status<>'pending' THEN RAISE EXCEPTION 'Invalid request' USING errcode='42501'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('friend-insert'),pg_catalog.hashtext(me::text));
    IF NOT animetrack_private.consume_budget('friend-insert',me::text,10,60)
      OR (SELECT count(*) FROM public.anime_friendships WHERE requester_id=me AND status='pending')>=50
      OR EXISTS(SELECT 1 FROM public.anime_friendships f WHERE
       (f.requester_id=me AND f.recipient_id=new.recipient_id) OR (f.requester_id=new.recipient_id AND f.recipient_id=me))
    THEN RAISE EXCEPTION 'Request unavailable' USING errcode='P0001'; END IF;
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION animetrack_private.friend_insert_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER anime_friend_insert_guard BEFORE INSERT ON public.anime_friendships
FOR EACH ROW EXECUTE FUNCTION animetrack_private.friend_insert_guard();
DROP POLICY "Participants see their friend connections" ON public.anime_friendships;
CREATE POLICY "Participants see active connections" ON public.anime_friendships FOR SELECT TO authenticated
USING (recipient_id=(SELECT auth.uid()) OR (requester_id=(SELECT auth.uid()) AND status<>'declined'));

-- Anonymous proxies share an atomic global ceiling across all Vercel instances.
-- This RPC can consume only fixed public budgets; it cannot reset or enlarge them.
CREATE FUNCTION public.anime_consume_proxy_budget(p_scope text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_scope NOT IN ('cinemeta','mal') OR p_scope IS NULL THEN RETURN false; END IF;
  RETURN animetrack_private.consume_budget('proxy-'||p_scope,'global',CASE WHEN p_scope='cinemeta' THEN 120 ELSE 90 END,60);
END $$;
REVOKE ALL ON FUNCTION public.anime_consume_proxy_budget(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anime_consume_proxy_budget(text) TO anon,authenticated,service_role;

CREATE FUNCTION public.anime_has_active_session() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
 WHERE s.user_id=(SELECT auth.uid()) AND s.id::text=(SELECT auth.jwt()->>'session_id'));
$$;
REVOKE ALL ON FUNCTION public.anime_has_active_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anime_has_active_session() TO authenticated,service_role;


-- Avoid recursive RLS expansion: the public-profile predicate does not re-enter friendship policies.
CREATE FUNCTION animetrack_private.is_public_profile(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.anime_has_active_session() AND EXISTS(SELECT 1 FROM public.anime_profiles WHERE user_id=p_user_id AND is_public);
$$;
REVOKE ALL ON FUNCTION animetrack_private.is_public_profile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION animetrack_private.is_public_profile(uuid) TO authenticated;
DROP POLICY "Members request visible profiles" ON public.anime_friendships;
CREATE POLICY "Members request visible profiles" ON public.anime_friendships FOR INSERT TO authenticated
WITH CHECK(requester_id=(SELECT auth.uid()) AND status='pending' AND animetrack_private.is_public_profile(recipient_id));

-- Cross-host avatars cannot be introduced via a direct REST write.
-- Existing invalid values are cleared, preserving profiles and libraries.
UPDATE public.anime_profiles SET avatar_url='' WHERE avatar_url<>'' AND avatar_url !~ '^https://kwherbtspqirfrehqlfd\.supabase\.co/storage/v1/object/(public|sign)/[^?#]+(\?[^#]*)?$';
ALTER TABLE public.anime_profiles ADD CONSTRAINT anime_profiles_avatar_storage
CHECK (avatar_url='' OR avatar_url ~ '^https://kwherbtspqirfrehqlfd\.supabase\.co/storage/v1/object/(public|sign)/[^?#]+(\?[^#]*)?$');

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE UPDATE ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
CREATE OR REPLACE FUNCTION private.enforce_episode_comment_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('episode-comment'),pg_catalog.hashtext(new.user_id::text));
 if exists(select 1 from public.episode_comments c where c.user_id = new.user_id and c.created_at > now() - interval '15 seconds') then
  raise exception 'Prit 15 sekonda para komentit tjetër.' using errcode = 'P0001';
 end if;
 if (select count(*) from public.episode_comments c where c.user_id = new.user_id and c.created_at > now() - interval '1 day') >= 30 then
  raise exception 'U arrit kufiri prej 30 komentesh në 24 orë.' using errcode = 'P0001';
 end if;
 return new;
end;
$function$;
DROP TRIGGER episode_comment_same_episode ON public.episode_comments;
DROP FUNCTION private.validate_episode_reply();
-- The browser cannot read or write encrypted provider credentials.
CREATE TABLE public.anime_provider_credentials (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK(provider IN ('anilist','mal')),
  ciphertext text NOT NULL CHECK(length(ciphertext)<24000),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,provider)
);
ALTER TABLE public.anime_provider_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_provider_credentials FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.anime_provider_credentials TO service_role;


CREATE OR REPLACE FUNCTION animetrack_private.require_account() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.anime_has_active_session() THEN RAISE EXCEPTION 'Authentication required' USING errcode='42501'; END IF;
 RETURN (SELECT auth.uid());
END $$;
-- Restrictive policies also reject still-signed JWTs after logout/account deletion.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['anime_libraries','anime_profiles','anime_friendships','anime_moderators','episode_comments','episode_comment_reports','anime_push_subscriptions','anime_push_reminders'] LOOP
 EXECUTE format('CREATE POLICY "Active account session" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.anime_has_active_session())) WITH CHECK ((SELECT public.anime_has_active_session()))',t);
 END LOOP;
END $$;

CREATE FUNCTION public.anime_account_operation_budget() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := animetrack_private.require_account();
BEGIN RETURN animetrack_private.consume_budget('account-operation',me::text,30,60); END $$;
REVOKE ALL ON FUNCTION public.anime_account_operation_budget() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anime_account_operation_budget() TO authenticated;

CREATE FUNCTION public.anime_recent_session() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=(SELECT auth.uid())
 AND s.id::text=(SELECT auth.jwt()->>'session_id') AND s.created_at>now()-interval '15 minutes');
$$;
REVOKE ALL ON FUNCTION public.anime_recent_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anime_recent_session() TO authenticated;

CREATE FUNCTION public.anime_account_storage_objects(p_user_id uuid) RETURNS TABLE(bucket_id text,name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT o.bucket_id,o.name FROM storage.objects o WHERE o.owner_id=p_user_id::text;
$$;
REVOKE ALL ON FUNCTION public.anime_account_storage_objects(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_account_storage_objects(uuid) TO service_role;

COMMIT;
