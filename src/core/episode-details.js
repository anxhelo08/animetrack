import { catalogJSON } from './request-cache.js';

// A streaming thumbnail belongs to this exact provider media ID and episode number.
export function episodeThumbnail(items, episode) {
  for (const item of Array.isArray(items) ? items : []) {
    const numbers = [...String(item?.title || '').matchAll(/\b(?:episode|ep\.?)[\s:#-]*(\d+)\b/gi)];
    if (numbers.length !== 1 || Number(numbers[0][1]) !== episode) continue;
    try {
      const url = new URL(item.thumbnail);
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      return {
        image: url.href,
        imageSource: 'AniList · ' + String(item.site || 'Streaming').slice(0, 60),
      };
    } catch {
      /* A missing thumbnail must never become a cover-image substitute. */
    }
  }
  return null;
}

export async function fetchEpisodeThumbnail({ sourceId, malId, episode }) {
  const id = /^\d+$/.test(String(sourceId || '')) ? Number(sourceId) : null;
  const idMal = /^\d+$/.test(String(malId || '')) ? Number(malId) : null;
  if (!id && !idMal) return null;
  const result = await catalogJSON('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query:
        'query($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){streamingEpisodes{title thumbnail site}}}',
      variables: id ? { id } : { idMal },
    }),
  });
  if (result.errors?.length) throw Error('Episode thumbnails unavailable');
  return episodeThumbnail(result.data?.Media?.streamingEpisodes, episode);
}
