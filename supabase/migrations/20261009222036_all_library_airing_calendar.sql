-- Refresh public schedules for every stored title, without changing personal libraries or privileges.
CREATE OR REPLACE FUNCTION public.anime_claim_airing_checks() RETURNS SETOF public.anime_airing_cache
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.anime_airing_cache(lookup_key,identity)
 WITH titles AS (
  SELECT a FROM public.anime_libraries l CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(l.payload->'anime')='array' THEN l.payload->'anime' ELSE '[]'::jsonb END) a
  WHERE coalesce(a->>'deletedAt','')=''
 ), parts AS (
  SELECT a AS p FROM titles UNION ALL SELECT s FROM titles CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a->'seasons')='array' THEN a->'seasons' ELSE '[]'::jsonb END) s
 ), identities AS (
  SELECT CASE lower(p->>'source') WHEN 'anilist' THEN 'anilist' WHEN 'myanimelist' THEN 'mal' WHEN 'jikan' THEN 'mal' WHEN 'tvmaze' THEN 'tvmaze' END AS provider,p->>'sourceId' AS id,p->>'malId' AS mal FROM parts
  UNION ALL SELECT 'mal',p->>'malId',p->>'malId' FROM parts WHERE coalesce(lower(p->>'source'),'') NOT IN ('anilist','myanimelist','jikan')
  UNION ALL SELECT split_part(k,':',1),split_part(k,':',2),NULL FROM titles CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(a->'providerIds')='array' THEN a->'providerIds' ELSE '[]'::jsonb END) k
 ) SELECT DISTINCT ON(provider,id) provider||':'||id,jsonb_build_object('provider',provider,'id',id,'malId',CASE WHEN mal ~ '^[0-9]{1,9}$' THEN mal ELSE '' END)
 FROM identities WHERE provider IN ('anilist','mal','tvmaze') AND id ~ '^[0-9]{1,9}$' AND id <> '0'
 ORDER BY provider,id,mal NULLS LAST
 ON CONFLICT(lookup_key) DO UPDATE SET identity=excluded.identity,seen_at=now();
 RETURN QUERY WITH due AS (
 SELECT lookup_key FROM public.anime_airing_cache
 WHERE seen_at>now()-interval '1 day' AND (checked_at IS NULL OR checked_at<now()-interval '1 day')
 AND (attempted_at IS NULL OR attempted_at<now()-interval '1 hour')
 AND (claimed_at IS NULL OR claimed_at<now()-interval '5 minutes')
 ORDER BY checked_at NULLS FIRST,lookup_key FOR UPDATE SKIP LOCKED LIMIT 2
 ) UPDATE public.anime_airing_cache c SET claimed_at=now(),claim_token=gen_random_uuid()
 FROM due WHERE c.lookup_key=due.lookup_key RETURNING c.*;
END $$;
