BEGIN;
ALTER TABLE public.anime_push_reminders
 ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 ADD COLUMN next_attempt_at timestamptz,
 ADD COLUMN claim_token uuid,
 ADD COLUMN terminal_reason text CHECK(terminal_reason IN ('sent','partial','failed','skipped','expired','no_subscriptions'));
CREATE INDEX anime_push_reminders_retry_idx ON public.anime_push_reminders(next_attempt_at,notify_at) WHERE sent_at IS NULL;
-- Browser upserts can edit schedule fields, but cannot reset server retry/lease state.
REVOKE INSERT,UPDATE ON public.anime_push_reminders FROM authenticated;
GRANT INSERT(user_id,event_key,anime_id,season_id,episode,title,air_at,notify_at),
 UPDATE(user_id,event_key,anime_id,season_id,episode,title,air_at,notify_at)
 ON public.anime_push_reminders TO authenticated;
CREATE TABLE public.anime_push_deliveries (
 reminder_id uuid NOT NULL REFERENCES public.anime_push_reminders(id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL REFERENCES public.anime_push_subscriptions(id) ON DELETE CASCADE,
 attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 5),
 status text NOT NULL CHECK(status IN ('pending','sent','failed')),
 next_attempt_at timestamptz,
 last_code integer,
 PRIMARY KEY(reminder_id,subscription_id)
);
ALTER TABLE public.anime_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_push_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.anime_push_deliveries TO service_role;
CREATE FUNCTION public.anime_claim_push_reminders() RETURNS SETOF public.anime_push_reminders
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 -- Recover interrupted claims without an endless loop. Expire reminders over a day late.
 UPDATE public.anime_push_reminders SET sent_at=now(),terminal_reason=CASE WHEN air_at<now()-interval '1 day' THEN 'expired' ELSE 'failed' END,claimed_at=NULL,claim_token=NULL
 WHERE sent_at IS NULL AND (claimed_at IS NULL OR claimed_at<now()-interval '5 minutes')
 AND (attempts>=5 OR air_at<now()-interval '1 day');
 RETURN QUERY WITH ready AS (
  SELECT id FROM public.anime_push_reminders WHERE sent_at IS NULL AND attempts<5
   AND (claimed_at IS NULL OR claimed_at<now()-interval '5 minutes')
   AND notify_at<=now() AND (next_attempt_at IS NULL OR next_attempt_at<=now())
  ORDER BY coalesce(next_attempt_at,notify_at),id FOR UPDATE SKIP LOCKED LIMIT 8
 ) UPDATE public.anime_push_reminders j SET claimed_at=now(),claim_token=gen_random_uuid(),attempts=j.attempts+1
 FROM ready WHERE j.id=ready.id RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.anime_claim_push_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anime_claim_push_reminders() TO service_role;
COMMIT;
