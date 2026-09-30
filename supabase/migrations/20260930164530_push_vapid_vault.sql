BEGIN;
-- Only the Edge runtime can initialize/read the encrypted VAPID pair. Browser roles cannot call this API.
CREATE FUNCTION public.anime_push_vapid_config(p_public_key text,p_private_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE stored text;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('animetrack-vapid-config'));
 SELECT decrypted_secret INTO stored FROM vault.decrypted_secrets WHERE name='animetrack_push_vapid_pair' LIMIT 1;
 IF stored IS NULL THEN
  IF p_public_key IS NULL OR p_public_key !~ '^[A-Za-z0-9_-]{87}$' OR p_private_key IS NULL OR p_private_key !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE EXCEPTION 'Invalid VAPID pair'; END IF;
  stored:=jsonb_build_object('publicKey',p_public_key,'privateKey',p_private_key)::text;
  PERFORM vault.create_secret(stored,'animetrack_push_vapid_pair');
 END IF;
 RETURN stored::jsonb;
END $$;
REVOKE ALL ON FUNCTION public.anime_push_vapid_config(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_push_vapid_config(text,text) TO service_role;
COMMIT;
