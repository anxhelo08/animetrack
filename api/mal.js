import { allowProxy, bearer, upstreamJSON, userAgent } from '../server/http.js';
const MAL = 'https://api.myanimelist.net/v2';
const integer = (v, min, max, otherwise) => {
  const n = Number(v ?? otherwise);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
export function createHandler({ fetchImpl = fetch, limit = allowProxy } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Missing MAL access token' });
    const action = req.query?.action;
    let target,
      method = 'GET',
      body;
    if (req.method === 'GET' && action === 'me') target = MAL + '/users/@me?fields=id,name,picture';
    else if (req.method === 'GET' && action === 'list') {
      const limit = integer(req.query?.limit, 1, 1000, 1000),
        offset = integer(req.query?.offset, 0, 100000, 0);
      if (limit === null || offset === null)
        return res.status(400).json({ error: 'Invalid pagination' });
      target =
        MAL +
        '/users/@me/animelist?' +
        new URLSearchParams({
          fields: 'list_status,num_episodes,media_type,start_date,mean,main_picture',
          sort: 'list_updated_at',
          limit: String(limit),
          offset: String(offset),
        });
    } else if (req.method === 'PATCH' && action === 'update') {
      const id = req.query?.id;
      if (typeof id !== 'string' || !/^\d{1,12}$/.test(id))
        return res.status(400).json({ error: 'Invalid MAL anime id' });
      let input = req.body;
      if (typeof input === 'string') {
        if (input.length > 4096) return res.status(413).json({ error: 'Payload too large' });
        try {
          input = JSON.parse(input);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      }
      if (!input || Array.isArray(input) || typeof input !== 'object')
        return res.status(400).json({ error: 'Invalid payload' });
      const status = input.status,
        progress = integer(input.num_watched_episodes, 0, 10000, 0),
        score = integer(input.score, 0, 10, 0);
      if (
        !['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'].includes(status) ||
        progress === null ||
        score === null
      )
        return res.status(400).json({ error: 'Invalid MAL list status' });
      target = MAL + '/anime/' + id + '/my_list_status';
      method = 'PATCH';
      body = new URLSearchParams({
        status,
        num_watched_episodes: String(progress),
        score: String(score),
      });
    } else {
      res.setHeader('Allow', 'GET,PATCH');
      return res.status(405).json({ error: 'Unsupported action or method' });
    }
    if (!(await limit(req, res, 'mal', { fetchImpl }))) return;
    try {
      const headers = {
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
        'User-Agent': userAgent,
      };
      if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const { status, data } = await upstreamJSON(target, { method, headers, body }, fetchImpl);
      return res.status(status).json(data);
    } catch {
      return res.status(502).json({ error: 'MyAnimeList temporarily unavailable' });
    }
  };
}
export default createHandler();
