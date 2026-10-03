import { fetchAiringSchedule } from '../../../src/core/airing-schedule.js';
/** Existing five-minute cron drains daily metadata jobs; personal libraries are never written. */
export async function checkAiringSchedules(admin, fetchSchedule = fetchAiringSchedule) {
  const claim = await admin.rpc('anime_claim_airing_checks');
  if (claim.error) return { checked: 0, failed: 1 };
  const stats = { checked: 0, failed: 0 };
  await Promise.all(
    (claim.data || []).map(async (job) => {
      let result = null;
      try {
        result = await fetchSchedule(job.identity, { signal: AbortSignal.timeout(22000) });
        if (result.checks.some((c) => c.status !== 'ok')) {
          const rows = new Map(
            (job.result?.events || []).map((e) => [
              [e.providerKey, e.seasonNumber || '', e.episode].join(':'),
              e,
            ]),
          );
          for (const e of result.events)
            rows.set([e.providerKey, e.seasonNumber || '', e.episode].join(':'), e);
          result.events = [...rows.values()]
            .filter((e) => e.when >= Date.now() - 30 * 86400000)
            .slice(0, 2000);
        }
      } catch {
        stats.failed++;
      }
      const finish = await admin.rpc('anime_finish_airing_check', {
        p_key: job.lookup_key,
        p_claim: job.claim_token,
        p_result: result || {},
        p_ok: !!result,
      });
      if (!finish.error && finish.data && result) stats.checked++;
    }),
  );
  return stats;
}
