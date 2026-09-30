import { cloudConfig } from '../config.js';

export function createAccountService({ client, user, fetchImpl = fetch }) {
  return {
    async call(payload) {
      const owner = user()?.id;
      if (!owner) throw new Error('Hyr në llogari për të vazhduar.');
      const { data, error } = await client().auth.getSession();
      const session = data?.session;
      if (error || !session?.access_token || session.user?.id !== owner)
        throw new Error('Hyr përsëri në llogari.');
      const r = await fetchImpl(cloudConfig.url + '/functions/v1/anime-account', {
        method: 'POST',
        headers: {
          apikey: cloudConfig.key,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const result = await r.json();
      if (user()?.id !== owner) throw new Error('Llogaria ndryshoi gjatë kërkesës.');
      if (!r.ok) throw new Error(result.error || 'Kërkesa dështoi. Provo përsëri.');
      return result;
    },
  };
}
Object.defineProperty(window, 'ATAccountService', { value: createAccountService });
