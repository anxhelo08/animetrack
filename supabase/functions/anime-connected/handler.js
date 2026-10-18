import { createTraktService } from './trakt.js';
import {
  calendarICS,
  feedEvents,
  hashToken,
  cleanText,
  publicItem,
  cleanFilter,
  featureKinds,
} from './model.js';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function createConnectedHandler({
  admin,
  clientForToken,
  fetchImpl = fetch,
  env = () => '',
  now = Date.now,
}) {
  const storage = async (q) => {
    const r = await q;
    if (r.error) throw Error('Ruajtja nuk u krye.');
    return r.data;
  };
  const trakt = createTraktService({ admin, storage, fetchImpl, env, now });
  return async (request) => {
    const origin = request.headers.get('origin'),
      allowed =
        !origin ||
        origin === 'https://animetrack-flax.vercel.app' ||
        /^https:\/\/animetrack-[a-z0-9-]+-xhenohyskaj-3395\.vercel\.app$/.test(origin) ||
        origin === 'http://127.0.0.1:8765';
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
      Vary: 'Origin',
    };
    if (origin && allowed) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return reply({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    try {
      const url = new URL(request.url),
        feed = url.searchParams.get('feed');
      if (request.method === 'GET') {
        if (!/^[a-f0-9]{64}$/.test(feed || '')) return reply({ error: 'Calendar not found' }, 404);
        const record = await storage(
          admin
            .from('anime_calendar_feeds')
            .select('owner_id,options')
            .eq('token_hash', await hashToken(feed))
            .maybeSingle(),
        );
        if (!record) return reply({ error: 'Calendar not found' }, 404);
        const library = await storage(
          admin
            .from('anime_libraries')
            .select('payload')
            .eq('user_id', record.owner_id)
            .maybeSingle(),
        );
        return new Response(
          calendarICS(feedEvents(library?.payload, record.options, now()), now()),
          {
            headers: {
              'Content-Type': 'text/calendar; charset=utf-8',
              'Cache-Control': 'private, max-age=300',
              'Referrer-Policy': 'no-referrer',
              'X-Content-Type-Options': 'nosniff',
            },
          },
        );
      }
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')?.[1];
      if (!token || token.length > 8192) return reply({ error: 'Hyr në llogari.' }, 401);
      const auth = await admin.auth.getUser(token),
        uid = auth.data?.user?.id;
      if (auth.error || !uid || auth.data.user.is_anonymous)
        return reply({ error: 'Hyr në llogari.' }, 401);
      const caller = clientForToken(token),
        active = await caller.rpc('anime_has_active_session');
      if (active.error || active.data !== true)
        return reply({ error: 'Sesioni ka përfunduar.' }, 401);
      const budget = await caller.rpc('anime_account_operation_budget');
      if (budget.error || budget.data !== true) return reply({ error: 'Provo pas pak.' }, 429);
      const text = await request.text();
      if (text.length > 100000) return reply({ error: 'Kërkesë tepër e madhe.' }, 413);
      let input;
      try {
        input = JSON.parse(text);
      } catch {
        return reply({ error: 'Invalid JSON' }, 400);
      }
      if (!input || typeof input !== 'object' || Array.isArray(input))
        return reply({ error: 'Invalid input' }, 400);
      const action = input.action;
      if (action.startsWith('trakt-') && action !== 'trakt-page')
        return reply(await trakt.action(uid, input));
      if (action === 'state') {
        const records = await storage(
          admin
            .from('anime_feature_records')
            .select('id,title,kind,rules,revision')
            .eq('owner_id', uid)
            .order('created_at'),
        );
        const owned = await storage(
          admin
            .from('anime_shared_lists')
            .select('id,title,owner_id,items,revision')
            .eq('owner_id', uid),
        );
        const memberships = await storage(
          admin.from('anime_list_members').select('list_id').eq('user_id', uid),
        );
        const shared = memberships.length
          ? await storage(
              admin
                .from('anime_shared_lists')
                .select('id,title,owner_id,items,revision')
                .in(
                  'id',
                  memberships.map((m) => m.list_id),
                ),
            )
          : [];
        const feeds = await storage(
          admin.from('anime_calendar_feeds').select('id,options').eq('owner_id', uid),
        );
        const lists = [...owned, ...shared];
        const votes = lists.length
          ? await storage(
              admin
                .from('anime_list_votes')
                .select('list_id,user_id,item_key')
                .in(
                  'list_id',
                  lists.map((l) => l.id),
                ),
            )
          : [];
        const editors = lists.length
          ? await storage(
              admin
                .from('anime_list_members')
                .select('list_id,user_id')
                .in(
                  'list_id',
                  lists.map((l) => l.id),
                ),
            )
          : [];
        for (const list of lists) {
          const valid = votes.filter(
            (v) =>
              v.list_id === list.id &&
              (v.user_id === list.owner_id ||
                editors.some((m) => m.list_id === list.id && m.user_id === v.user_id)) &&
              list.items.some((i) => i.key === v.item_key),
          );
          list.votes = Object.fromEntries(
            list.items.map((i) => [i.key, valid.filter((v) => v.item_key === i.key).length]),
          );
          list.myVote = valid.find((v) => v.user_id === uid)?.item_key || '';
        }
        return reply({
          records,
          lists,
          feeds,
          traktConfigured: !!env('TRAKT_CLIENT_ID'),
          trakt: await trakt.status(uid),
        });
      }
      if (action === 'rule-create') {
        const title = cleanText(input.title, 50);
        if (title.length < 2 || !featureKinds.includes(input.kind))
          return reply({ error: 'Emër ose lloj i pavlefshëm.' }, 400);
        const count = await storage(
          admin.from('anime_feature_records').select('id').eq('owner_id', uid),
        );
        if (count.length >= 50) return reply({ error: 'U arrit kufiri prej 50 pamjesh.' }, 400);
        const record = await storage(
          admin
            .from('anime_feature_records')
            .insert({ owner_id: uid, title, kind: input.kind, rules: cleanFilter(input.rules) })
            .select('id,title,kind,rules,revision')
            .single(),
        );
        return reply({ record });
      }
      if (action === 'rule-delete') {
        if (!UUID.test(input.id || '')) return reply({ error: 'Invalid ID' }, 400);
        await storage(
          admin.from('anime_feature_records').delete().eq('owner_id', uid).eq('id', input.id),
        );
        return reply({ ok: true });
      }
      if (action === 'feed-create') {
        const bytes = crypto.getRandomValues(new Uint8Array(32)),
          secret = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
        const options = {
          ...cleanFilter(input.options),
          unwatched: input.options?.unwatched === true,
          favorites: input.options?.favorites === true,
          release: ['premiere', 'season', 'finale'].includes(input.options?.release)
            ? input.options.release
            : 'all',
        };
        const rows = await storage(
          admin.from('anime_calendar_feeds').select('id').eq('owner_id', uid),
        );
        if (rows.length >= 5)
          return reply({ error: 'Hiq një abonim para se të krijosh tjetër.' }, 400);
        const record = await storage(
          admin
            .from('anime_calendar_feeds')
            .insert({ owner_id: uid, token_hash: await hashToken(secret), options })
            .select('id')
            .single(),
        );
        return reply({
          id: record.id,
          url: new URL(request.url).origin + new URL(request.url).pathname + '?feed=' + secret,
        });
      }
      if (action === 'feed-delete') {
        if (!UUID.test(input.id || '')) return reply({ error: 'Invalid ID' }, 400);
        await storage(
          admin.from('anime_calendar_feeds').delete().eq('owner_id', uid).eq('id', input.id),
        );
        return reply({ ok: true });
      }
      if (action === 'list-create') {
        const title = cleanText(input.title, 50);
        if (title.length < 2) return reply({ error: 'Shkruaj emrin e listës.' }, 400);
        const rows = await storage(
          admin.from('anime_shared_lists').select('id').eq('owner_id', uid),
        );
        if (rows.length >= 20) return reply({ error: 'U arrit kufiri prej 20 listash.' }, 400);
        const list = await storage(
          admin
            .from('anime_shared_lists')
            .insert({ owner_id: uid, title })
            .select('id,title,owner_id,items,revision')
            .single(),
        );
        return reply({ list });
      }
      if (
        [
          'list-item',
          'list-member',
          'list-delete',
          'list-members',
          'list-vote',
          'list-remove-member',
        ].includes(action)
      ) {
        if (!UUID.test(input.id || '')) return reply({ error: 'Invalid ID' }, 400);
        const list = await storage(
          admin
            .from('anime_shared_lists')
            .select('id,title,owner_id,items,revision')
            .eq('id', input.id)
            .maybeSingle(),
        );
        if (!list) return reply({ error: 'Lista nuk u gjet.' }, 404);
        const isOwner = list.owner_id === uid;
        const member =
          isOwner ||
          !!(await storage(
            admin
              .from('anime_list_members')
              .select('user_id')
              .eq('list_id', list.id)
              .eq('user_id', uid)
              .maybeSingle(),
          ));
        if (!member || (!isOwner && !['list-item', 'list-vote'].includes(action)))
          return reply({ error: 'Nuk ke leje për këtë veprim.' }, 403);
        if (action === 'list-vote') {
          if (input.itemKey && !list.items.some((i) => i.key === input.itemKey))
            return reply({ error: 'Titulli nuk gjendet në listë.' }, 400);
          if (input.itemKey)
            await storage(
              admin
                .from('anime_list_votes')
                .upsert(
                  { list_id: list.id, user_id: uid, item_key: input.itemKey },
                  { onConflict: 'list_id,user_id' },
                ),
            );
          else
            await storage(
              admin.from('anime_list_votes').delete().eq('list_id', list.id).eq('user_id', uid),
            );
          return reply({ ok: true });
        }
        if (action === 'list-members')
          return reply({
            members: await storage(
              admin.from('anime_list_members').select('user_id,handle').eq('list_id', list.id),
            ),
          });
        if (action === 'list-delete') {
          await storage(
            admin.from('anime_shared_lists').delete().eq('id', list.id).eq('owner_id', uid),
          );
          return reply({ ok: true });
        }
        if (action === 'list-remove-member') {
          await storage(
            admin
              .from('anime_list_votes')
              .delete()
              .eq('list_id', list.id)
              .eq('user_id', input.userId),
          );
          if (!UUID.test(input.userId || '')) return reply({ error: 'Invalid ID' }, 400);
          await storage(
            admin
              .from('anime_list_members')
              .delete()
              .eq('list_id', list.id)
              .eq('user_id', input.userId),
          );
          return reply({ ok: true });
        }
        if (action === 'list-member') {
          const profile = await storage(
            admin
              .from('anime_profiles')
              .select('user_id,handle')
              .eq('handle', cleanText(input.handle, 40))
              .maybeSingle(),
          );
          if (!profile || profile.user_id === uid)
            return reply({ error: 'Zgjidh një mik të pranuar.' }, 400);
          const friendships = await storage(
            admin
              .from('anime_friendships')
              .select('requester_id,recipient_id')
              .eq('status', 'accepted')
              .or('requester_id.eq.' + uid + ',recipient_id.eq.' + uid),
          );
          if (
            !friendships.some(
              (f) => f.requester_id === profile.user_id || f.recipient_id === profile.user_id,
            )
          )
            return reply({ error: 'Përdoruesi duhet të jetë mik i pranuar.' }, 403);
          await storage(
            admin
              .from('anime_list_members')
              .upsert(
                { list_id: list.id, user_id: profile.user_id, handle: profile.handle },
                { onConflict: 'list_id,user_id' },
              ),
          );
          return reply({ ok: true });
        }
        const item = publicItem(input.item);
        let items = list.items.filter((i) => i.key !== item.key);
        if (!input.remove) items.push(item);
        if (items.length > 150) return reply({ error: 'Lista pranon 150 tituj.' }, 400);
        if (input.revision !== list.revision)
          return reply({ error: 'Lista ndryshoi. Rifresko përpara se ta ndryshosh.' }, 409);
        const updated = await storage(
          admin
            .from('anime_shared_lists')
            .update({ items, revision: list.revision + 1 })
            .eq('id', list.id)
            .eq('revision', list.revision)
            .select('id')
            .maybeSingle(),
        );
        if (!updated) return reply({ error: 'Lista ndryshoi. Rifresko.' }, 409);
        return reply({ ok: true });
      }
      if (action === 'trakt-page') {
        const clientId = env('TRAKT_CLIENT_ID');
        if (!clientId)
          return reply(
            {
              error:
                'Lidhja direkte me Trakt kërkon regjistrimin e aplikacionit. Përdor importin JSON.',
            },
            503,
          );
        // Public profiles can be read without holding user OAuth tokens. Private profiles use JSON export.
        const username = cleanText(input.username, 60),
          page = Number(input.page) || 1;
        if (
          !/^[a-zA-Z0-9_-]{1,60}$/.test(username) ||
          !Number.isInteger(page) ||
          page < 1 ||
          page > 100
        )
          return reply({ error: 'Përdorues ose faqe e pavlefshme.' }, 400);
        const kind = ['history', 'watchlist', 'ratings'].includes(input.kind)
          ? input.kind
          : 'history';
        const response = await fetchImpl(
          'https://api.trakt.tv/users/' +
            encodeURIComponent(username) +
            '/' +
            kind +
            '?page=' +
            page +
            '&limit=100',
          {
            headers: {
              'trakt-api-version': '2',
              'trakt-api-key': clientId,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!response.ok)
          return reply(
            { error: 'Profili nuk është publik ose Trakt nuk u përgjigj. Përdor eksportin JSON.' },
            502,
          );
        const rows = await response.json();
        if (!Array.isArray(rows)) throw Error('Invalid Trakt response');
        return reply({
          rows: kind === 'watchlist' ? rows.map((r) => ({ ...r, planned: true })) : rows,
          page,
          pages: Number(response.headers.get('x-pagination-page-count')) || page,
        });
      }
      return reply({ error: 'Veprim i panjohur.' }, 400);
    } catch (error) {
      return reply(
        { error: error instanceof Error ? error.message : 'Shërbimi nuk u arrit.' },
        400,
      );
    }
  };
}
