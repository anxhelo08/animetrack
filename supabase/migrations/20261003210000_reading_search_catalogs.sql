BEGIN;
CREATE OR REPLACE FUNCTION public.anime_consume_proxy_budget(p_scope text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_scope NOT IN ('cinemeta','mal','weebcentral','reading-search') OR p_scope IS NULL THEN RETURN false; END IF;
 RETURN animetrack_private.consume_budget('proxy-'||p_scope,'global',CASE p_scope WHEN 'cinemeta' THEN 120 WHEN 'weebcentral' THEN 20 ELSE 90 END,60);
END $$;
CREATE OR REPLACE FUNCTION public.anime_claim_reading_checks() RETURNS SETOF public.anime_reading_checks
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.anime_reading_checks(user_id,reading_id,reading)
 SELECT l.user_id,r->>'id', r - 'notes' - 'journal'
 FROM public.anime_libraries l CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(l.payload->'readingLibrary')='array' THEN l.payload->'readingLibrary' ELSE '[]'::jsonb END) r
 WHERE coalesce(r->>'deletedAt','')='' AND (r->>'sourceId' ~ '^\d+$' OR (r->>'source'='weebcentral' AND r->>'sourceId' ~ '^[0-9A-HJKMNP-TV-Z]{26}$') OR (r->>'source'='mangadex' AND r->>'sourceId' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'))
 AND r->>'id' ~ '^reading-[a-zA-Z0-9_-]{1,100}$'
 AND coalesce(r->>'publicationStatus','') NOT IN ('FINISHED','CANCELLED')
 ON CONFLICT(user_id,reading_id) DO UPDATE SET reading=excluded.reading;
 RETURN QUERY WITH ready AS (
 SELECT c.user_id,c.reading_id FROM public.anime_reading_checks c JOIN public.anime_libraries l USING(user_id)
 WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(l.payload->'readingLibrary') r WHERE r->>'id'=c.reading_id AND coalesce(r->>'deletedAt','')='' AND coalesce(r->>'publicationStatus','') NOT IN ('FINISHED','CANCELLED'))
 AND (c.checked_at IS NULL OR c.checked_at<now()-interval '30 minutes')
 AND (c.claimed_at IS NULL OR c.claimed_at<now()-interval '5 minutes')
 ORDER BY c.checked_at NULLS FIRST,c.user_id,c.reading_id FOR UPDATE OF c SKIP LOCKED LIMIT 2
 ) UPDATE public.anime_reading_checks c SET claimed_at=now(),claim_token=gen_random_uuid()
 FROM ready r WHERE c.user_id=r.user_id AND c.reading_id=r.reading_id RETURNING c.*;
END $$;
COMMIT;
