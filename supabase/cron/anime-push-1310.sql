-- Production only: install AFTER the tested queue migration and dispatcher.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='animetrack_push_cron_secret') THEN
  PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'animetrack_push_cron_secret');
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.anime_push_authorize_cron(p_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE expected text;
BEGIN
 IF p_token IS NULL OR length(p_token)<32 OR length(p_token)>256 THEN RETURN false; END IF;
 SELECT decrypted_secret INTO expected FROM vault.decrypted_secrets WHERE name='animetrack_push_cron_secret' LIMIT 1;
 RETURN expected IS NOT NULL AND extensions.digest(p_token,'sha256')=extensions.digest(expected,'sha256');
END $$;
REVOKE ALL ON FUNCTION public.anime_push_authorize_cron(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_push_authorize_cron(text) TO service_role;
SELECT cron.schedule('animetrack-push-every-five-minutes','*/5 * * * *',$cron$
 SELECT net.http_post(
  url:='https://kwherbtspqirfrehqlfd.supabase.co/functions/v1/anime-push-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','X-Cron-Secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='animetrack_push_cron_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 );
$cron$);
