BEGIN;
ALTER TABLE public.anime_push_reminders DROP CONSTRAINT anime_push_reminders_anime_id_check;
ALTER TABLE public.anime_push_reminders ADD CONSTRAINT anime_push_reminders_anime_id_check CHECK(char_length(anime_id) BETWEEN 1 AND 120);
CREATE TABLE public.anime_reading_checks (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 reading_id text NOT NULL CHECK (reading_id ~ '^reading-[a-zA-Z0-9_-]{1,100}$'),
 reading jsonb NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',
 checked_at timestamptz,
 claimed_at timestamptz,
 claim_token uuid,
 PRIMARY KEY(user_id,reading_id)
);
ALTER TABLE public.anime_reading_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_reading_checks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.anime_reading_checks TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.anime_reading_checks TO service_role;
CREATE POLICY "Reading metadata owned" ON public.anime_reading_checks FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND (SELECT public.anime_has_active_session()));
CREATE INDEX anime_reading_checks_due_idx ON public.anime_reading_checks(checked_at);
CREATE FUNCTION public.anime_claim_reading_checks() RETURNS SETOF public.anime_reading_checks
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.anime_reading_checks(user_id,reading_id,reading)
 SELECT l.user_id,r->>'id', r - 'notes' - 'journal'
 FROM public.anime_libraries l CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(l.payload->'readingLibrary')='array' THEN l.payload->'readingLibrary' ELSE '[]'::jsonb END) r
 WHERE l.payload->'preferences'->>'readingNotifications'='true'
 AND coalesce(r->>'deletedAt','')='' AND r->>'sourceId' ~ '^\d+$'
 AND r->>'id' ~ '^reading-[a-zA-Z0-9_-]{1,100}$'
 AND coalesce(r->>'publicationStatus','') NOT IN ('FINISHED','CANCELLED')
 ON CONFLICT(user_id,reading_id) DO UPDATE SET reading=excluded.reading;
 RETURN QUERY WITH ready AS (
 SELECT c.user_id,c.reading_id FROM public.anime_reading_checks c JOIN public.anime_libraries l USING(user_id)
 WHERE l.payload->'preferences'->>'readingNotifications'='true'
 AND EXISTS (SELECT 1 FROM jsonb_array_elements(l.payload->'readingLibrary') r WHERE r->>'id'=c.reading_id AND coalesce(r->>'deletedAt','')='' AND coalesce(r->>'publicationStatus','') NOT IN ('FINISHED','CANCELLED'))
 AND (c.checked_at IS NULL OR c.checked_at<now()-interval '30 minutes')
 AND (c.claimed_at IS NULL OR c.claimed_at<now()-interval '5 minutes')
 ORDER BY c.checked_at NULLS FIRST,c.user_id,c.reading_id FOR UPDATE OF c SKIP LOCKED LIMIT 2
 ) UPDATE public.anime_reading_checks c SET claimed_at=now(),claim_token=gen_random_uuid()
 FROM ready r WHERE c.user_id=r.user_id AND c.reading_id=r.reading_id RETURNING c.*;
END $$;
CREATE FUNCTION public.anime_finish_reading_check(p_user_id uuid,p_reading_id text,p_claim uuid,p_metadata jsonb,p_chapter integer) RETURNS boolean
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE changed integer; current_reading jsonb; enabled boolean;
BEGIN
 UPDATE public.anime_reading_checks SET metadata=p_metadata,checked_at=now(),claimed_at=NULL,claim_token=NULL
 WHERE user_id=p_user_id AND reading_id=p_reading_id AND claim_token=p_claim;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RETURN false; END IF;
 SELECT r,l.payload->'preferences'->>'readingNotifications'='true' AND l.payload->'preferences'->>'pushEnabled'='true'
 INTO current_reading,enabled FROM public.anime_libraries l CROSS JOIN LATERAL jsonb_array_elements(l.payload->'readingLibrary') r
 WHERE l.user_id=p_user_id AND r->>'id'=p_reading_id AND coalesce(r->>'deletedAt','')='';
 IF enabled AND p_chapter BETWEEN 1 AND 10000 AND NOT coalesce(current_reading->'chaptersRead','[]'::jsonb) @> to_jsonb(ARRAY[p_chapter]) THEN
 INSERT INTO public.anime_push_reminders(user_id,event_key,anime_id,season_id,episode,title,air_at,notify_at)
 VALUES(p_user_id,'reading:'||p_reading_id||':'||p_chapter,p_reading_id,'',p_chapter,left(current_reading->>'title',140),now(),now())
 ON CONFLICT(user_id,event_key) DO NOTHING;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.anime_claim_reading_checks(),public.anime_finish_reading_check(uuid,text,uuid,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_claim_reading_checks(),public.anime_finish_reading_check(uuid,text,uuid,jsonb,integer) TO service_role;
COMMIT;
