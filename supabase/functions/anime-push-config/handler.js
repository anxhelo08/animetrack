export function createConfigHandler({ publicKey, authenticate, getPublicKey }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    if (request.method !== 'POST')
      return new Response('Method not allowed', { status: 405, headers });
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')?.[1];
    let valid = false;
    try {
      valid = !!token && token.length <= 8192 && (await authenticate(token));
    } catch {
      valid = false;
    }
    if (!valid)
      return Response.json({ error: 'Authentication required' }, { status: 401, headers });
    let key = publicKey;
    try {
      if (getPublicKey) key = await getPublicKey();
    } catch {
      key = '';
    }
    if (!/^[A-Za-z0-9_-]{80,100}$/.test(key))
      return Response.json({ enabled: false, reason: 'not_configured' }, { status: 503, headers });
    return Response.json({ enabled: true, publicKey: key }, { headers });
  };
}
