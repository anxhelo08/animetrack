import { refreshReadingCatalog } from '../../../src/modules/reading-catalog.js';
import { applyReadingUpdate, normalizeReadingLibrary } from '../../../src/core/reading-model.js';

/** Public metadata lives separately so a background check never overwrites a user's library. */
export async function checkReadingReleases(admin, refresh = refreshReadingCatalog, now = Date.now) {
  const claim = await admin.rpc('anime_claim_reading_checks');
  if (claim.error) throw Error('Reading queue unavailable');
  const stats = { checked: 0, updated: 0, failed: 0 };
  await Promise.all(
    (claim.data || []).map(async (job) => {
      try {
        const row = normalizeReadingLibrary([job.reading])[0];
        if (!row) throw Error('Invalid reading row');
        if (job.metadata?.totalChapters)
          applyReadingUpdate(row, job.metadata, job.checked_at || new Date(now()).toISOString());
        const previous = row.totalChapters;
        const fresh = await refresh(row, AbortSignal.timeout(18000));
        const stamp = new Date(now()).toISOString();
        const delta = applyReadingUpdate(row, fresh, stamp);
        const metadata = {
          totalChapters: row.totalChapters,
          totalVolumes: row.totalVolumes,
          publicationStatus: row.publicationStatus,
          mangaDexId: row.mangaDexId,
          chapterSource: row.chapterSource,
          chapterReleases: row.chapterReleases,
          volumeRanges: row.volumeRanges,
        };
        const finish = await admin.rpc('anime_finish_reading_check', {
          p_user_id: job.user_id,
          p_reading_id: row.id,
          p_claim: job.claim_token,
          p_metadata: metadata,
          p_chapter: previous > 0 && delta > 0 ? row.totalChapters : 0,
        });
        if (finish.error) throw Error('Reading queue unavailable');
        stats.checked++;
        if (previous > 0 && delta > 0) stats.updated++;
      } catch {
        stats.failed++;
      }
    }),
  );
  return stats;
}
