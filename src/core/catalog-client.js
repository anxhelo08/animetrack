// Catalog transport; the controller owns request cancellation and UI state.
export const API_QUERY = `query ($search:String!, $page:Int!) { Page(page:$page, perPage:12) { pageInfo { hasNextPage } media(search:$search, type:ANIME, sort:SEARCH_MATCH, isAdult:false) { id idMal title { romaji english native } synonyms coverImage { large } episodes seasonYear startDate { year month day } format averageScore description(asHtml:false) genres siteUrl } } }`;

export const SEASON_QUERY = `query ($id:Int!) { Media(id:$id,type:ANIME) { id idMal averageScore episodes status format seasonYear description(asHtml:false) siteUrl startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english native } relations { edges { relationType node { id idMal averageScore type format episodes status seasonYear description(asHtml:false) siteUrl startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english } } } } } }`;

export async function anilistMedia(id) {
  let r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: SEASON_QUERY, variables: { id: Number(id) } }),
  });
  if (!r.ok) throw Error('AniList HTTP ' + r.status);
  let j = await r.json();
  if (j.errors?.length || !j.data?.Media)
    throw Error(j.errors?.[0]?.message || 'AniList metadata unavailable');
  return j.data.Media;
}

export const MAL_LINK_QUERY = `query ($idMal:Int!) { Media(idMal:$idMal,type:ANIME) { id } }`;

export async function anilistIdFromMal(idMal) {
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: MAL_LINK_QUERY, variables: { idMal: Number(idMal) } }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return Number(j?.data?.Media?.id) || null;
}

export async function jikanGet(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error('MyAnimeList HTTP ' + r.status);
  return r.json();
}
