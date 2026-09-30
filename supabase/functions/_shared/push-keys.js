export async function resolveVapid({ admin, publicKey, privateKey, generate }) {
  if (publicKey && privateKey) return { publicKey, privateKey };
  // Keep one stable pair across invocations/regions. Generation stays inside the server runtime.
  const pair = generate();
  const { data, error } = await admin.rpc('anime_push_vapid_config', {
    p_public_key: pair.publicKey,
    p_private_key: pair.privateKey,
  });
  if (
    error ||
    !/^[A-Za-z0-9_-]{87}$/.test(data?.publicKey || '') ||
    !/^[A-Za-z0-9_-]{43}$/.test(data?.privateKey || '')
  )
    throw Error('VAPID unavailable');
  return data;
}
