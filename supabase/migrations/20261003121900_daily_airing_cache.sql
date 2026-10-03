-- Public provider metadata only; no library, account, notes or watched flags are stored here.
CREATE TABLE public.anime_airing_cache (
 lookup_key text PRIMARY KEY CHECK(lookup_key ~ '^(anilist|mal|tvmaze):[0-9]{1,9}$'),
 identity jsonb NOT NULL,
 result jsonb NOT NULL DEFAULT '{}'::jsonb,
 checked_at timestamptz,
 seen_at timestamptz NOT NULL DEFAULT now(),
 attempted_at timestamptz,
 claimed_at timestamptz,
 claim_token uuid
);
ALTER TABLE public.anime_airing_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_airing_cache FROM anon,authenticated;
GRANT SELECT(lookup_key,result,checked_at) ON public.anime_airing_cache TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.anime_airing_cache TO service_role;
CREATE POLICY "Authenticated public schedule metadata" ON public.anime_airing_cache FOR SELECT TO authenticated
 USING((SELECT public.anime_has_active_session()));
CREATE FUNCTION public.anime_claim_airing_checks() RETURNS SETOF public.anime_airing_cache
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.anime_airing_cache(lookup_key,identity)
 WITH titles AS (
  SELECT a FROM public.anime_libraries l CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(l.payload->'anime')='array' THEN l.payload->'anime' ELSE '[]'::jsonb END) a
  WHERE a->>'status' IN ('watching','completed') AND coalesce(a->>'deletedAt','')=''
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
CREATE FUNCTION public.anime_finish_airing_check(p_key text,p_claim uuid,p_result jsonb,p_ok boolean) RETURNS boolean
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE updated integer;
BEGIN
 UPDATE public.anime_airing_cache SET result=CASE WHEN p_ok THEN p_result ELSE result END,
 checked_at=CASE WHEN p_ok THEN now() ELSE checked_at END,attempted_at=now(),claimed_at=NULL,claim_token=NULL
 WHERE lookup_key=p_key AND claim_token=p_claim;
 GET DIAGNOSTICS updated=ROW_COUNT;RETURN updated=1;
END $$;
REVOKE ALL ON FUNCTION public.anime_claim_airing_checks(),public.anime_finish_airing_check(text,uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_claim_airing_checks(),public.anime_finish_airing_check(text,uuid,jsonb,boolean) TO service_role;
