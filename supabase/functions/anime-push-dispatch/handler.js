import {
  MAX_ATTEMPTS,
  permittedEndpoint,
  stillWanted,
  retryTime,
  classify,
  safeEqual,
  validSubject,
} from '../_shared/push-policy.js';
const checked = async (p) => {
  const r = await p;
  if (r.error) throw Error('Queue unavailable');
  return r.data;
};
export function createDispatcher({
  admin,
  send,
  secret,
  subject,
  configured = true,
  now = Date.now,
}) {
  return async (request) => {
    if (request.method !== 'POST') return new Response('Unauthorized', { status: 401 });
    const token = request.headers.get('X-Cron-Secret') || '';
    let authorized = secret?.length >= 32 && safeEqual(token, secret);
    if (!authorized && token.length >= 32 && token.length <= 256) {
      try {
        authorized =
          (await checked(admin.rpc('anime_push_authorize_cron', { p_token: token }))) === true;
      } catch {
        authorized = false;
      }
    }
    if (!authorized) return new Response('Unauthorized', { status: 401 });
    if (!configured || !validSubject(subject))
      return Response.json({ error: 'Push configuration unavailable' }, { status: 503 });
    const stats = { processed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 };
    try {
      const jobs = (await checked(admin.rpc('anime_claim_push_reminders'))) || [];
      stats.processed = jobs.length;
      const owners = [...new Set(jobs.map((j) => j.user_id))];
      if (!owners.length) return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
      // One library/subscription read for the entire user group, even for several reminders.
      const [libraries, subscriptions] = await Promise.all([
        checked(admin.from('anime_libraries').select('user_id,payload').in('user_id', owners)),
        checked(
          admin
            .from('anime_push_subscriptions')
            .select('id,user_id,endpoint,p256dh,auth_key')
            .in('user_id', owners),
        ),
      ]);
      const library = new Map((libraries || []).map((x) => [x.user_id, x.payload]));
      const subs = new Map(
        owners.map((id) => [
          id,
          (subscriptions || []).filter((s) => s.user_id === id).slice(0, 10),
        ]),
      );
      const finish = async (job, values) =>
        checked(
          admin
            .from('anime_push_reminders')
            .update({ ...values, claimed_at: null, claim_token: null })
            .eq('id', job.id)
            .eq('claim_token', job.claim_token),
        );
      const terminal = (job, reason) =>
        finish(job, {
          sent_at: new Date(now()).toISOString(),
          terminal_reason: reason,
          next_attempt_at: null,
        });
      const process = async (job) => {
        if (!stillWanted(job, library.get(job.user_id))) {
          await terminal(job, 'skipped');
          stats.skipped++;
          return;
        }
        const list = subs.get(job.user_id);
        if (!list.length) {
          await terminal(job, 'no_subscriptions');
          stats.skipped++;
          return;
        }
        const existing = await checked(
          admin.from('anime_push_deliveries').select('*').eq('reminder_id', job.id),
        );
        const previous = new Map((existing || []).map((d) => [d.subscription_id, d]));
        const outcomes = [];
        for (let i = 0; i < list.length; i += 5)
          await Promise.all(
            list.slice(i, i + 5).map(async (sub) => {
              const old = previous.get(sub.id);
              if (old?.status === 'sent' || old?.status === 'failed') {
                outcomes.push(old);
                return;
              }
              if (old?.next_attempt_at && Date.parse(old.next_attempt_at) > now()) {
                outcomes.push(old);
                return;
              }
              const attempts = (old?.attempts || 0) + 1;
              let delivery = {
                reminder_id: job.id,
                subscription_id: sub.id,
                attempts,
                status: 'pending',
                next_attempt_at: null,
                last_code: null,
              };
              if (attempts > MAX_ATTEMPTS || !permittedEndpoint(sub.endpoint)) {
                delivery = {
                  ...delivery,
                  attempts: Math.min(attempts, MAX_ATTEMPTS),
                  status: 'failed',
                  last_code: 0,
                };
              } else {
                // Persist the attempt BEFORE network I/O, including an invocation that crashes.
                await checked(
                  admin
                    .from('anime_push_deliveries')
                    .upsert(delivery, { onConflict: 'reminder_id,subscription_id' }),
                );
                try {
                  await send(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                    JSON.stringify({
                      title: 'AnimeTrack · Kujtesa e episodit',
                      body: String(job.title).slice(0, 140) + ' · EP ' + job.episode,
                      tag: 'animetrack:' + job.event_key,
                      url: '/?source=push',
                    }),
                    { TTL: 3600, urgency: 'normal', timeout: 10000 },
                  );
                  delivery = { ...delivery, status: 'sent' };
                  stats.sent++;
                } catch (error) {
                  const kind = classify(error);
                  delivery.last_code = Number(error?.statusCode || 0);
                  if (kind === 'expired') {
                    await checked(admin.from('anime_push_subscriptions').delete().eq('id', sub.id));
                    outcomes.push({ ...delivery, status: 'failed' });
                    stats.failed++;
                    return;
                  }
                  delivery.status =
                    kind === 'retry' && attempts < MAX_ATTEMPTS ? 'pending' : 'failed';
                  if (delivery.status === 'pending')
                    delivery.next_attempt_at = retryTime(
                      attempts,
                      now(),
                      error?.headers?.['retry-after'],
                    );
                  stats.failed++;
                }
              }
              await checked(
                admin
                  .from('anime_push_deliveries')
                  .upsert(delivery, { onConflict: 'reminder_id,subscription_id' }),
              );
              outcomes.push(delivery);
            }),
          );
        const pending = outcomes.filter((d) => d.status === 'pending'),
          successful = outcomes.some((d) => d.status === 'sent');
        if (pending.length && job.attempts < MAX_ATTEMPTS) {
          const next = Math.max(
            now() + 300000,
            Math.min(
              ...pending.map((d) =>
                Date.parse(d.next_attempt_at || retryTime(job.attempts, now())),
              ),
            ),
          );
          await finish(job, { next_attempt_at: new Date(next).toISOString() });
          stats.retried++;
        } else
          await terminal(
            job,
            successful
              ? pending.length || outcomes.some((d) => d.status === 'failed')
                ? 'partial'
                : 'sent'
              : 'failed',
          );
      };
      // Bound concurrency and invocation duration: at most 8 jobs, 4 jobs/20 endpoints at once.
      for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(process));
      return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json(
        { error: 'Queue unavailable; leases recover automatically' },
        { status: 500 },
      );
    }
  };
}
