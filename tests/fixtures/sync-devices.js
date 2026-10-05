export function syncServer(initial) {
  let payload = structuredClone(initial),
    revision = new Date().toISOString(),
    count = 0;
  const pages = new Set();
  const request = async ({ table, mode, value, filters }) => {
    if (table === 'clock') return { data: new Date().toISOString(), error: null };
    if (table !== 'anime_libraries') return { data: null, error: null };
    if (mode === 'read')
      return { data: { payload: structuredClone(payload), updated_at: revision }, error: null };
    if (filters.updated_at && filters.updated_at !== revision) return { data: null, error: null };
    if (mode === 'insert') return { data: null, error: { code: '23505' } };
    payload = structuredClone(value.payload);
    revision = new Date(Date.now() + ++count).toISOString();
    const record = { new: { payload: structuredClone(payload), updated_at: revision } };
    setTimeout(() => {
      for (const page of pages)
        if (!page.isClosed())
          page
            .evaluate((record) => {
              if (navigator.onLine) window.__syncRealtime?.(record);
            }, record)
            .catch(() => {});
    }, 0);
    return { data: { updated_at: revision }, error: null };
  };
  return { request, pages, payload: () => structuredClone(payload), writes: () => count };
}
export async function openSyncDevice(page, server, skew = 0) {
  server.pages.add(page);
  await page.exposeFunction('__syncRequest', server.request);
  const stub = `
  const request=async q=>navigator.onLine?window.__syncRequest(q):{data:null,error:{message:'Offline'}};
  const chain=table=>{let mode='read',value=null,filters={};const q={};
   for(const key of ['select','eq','order','limit','in','not','or','insert','upsert','update','delete','range','neq','gte','lte','contains'])q[key]=(...args)=>{if(['insert','upsert','update','delete'].includes(key)){mode=key;value=args[0]}if(key==='eq')filters[args[0]]=args[1];return q};
   q.maybeSingle=()=>request({table,mode,value,filters});q.single=q.maybeSingle;
   q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q};
  export default ()=>({auth:{getSession:async()=>({data:{session:{user:{id:'sync-owner',email:'sync@example.com'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,
   rpc:name=>name==='animetrack_server_time'?request({table:'clock'}):chain('rpc'),
   channel:()=>{const channel={on:(_e,_filter,cb)=>{window.__syncRealtime=cb;return channel},subscribe:cb=>{cb('SUBSCRIBED');return channel},unsubscribe(){}};return channel},removeChannel(){}
  });`;
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (/\/assets\/supabase-client\.[^/]+\.js$/.test(url.pathname))
      return route.fulfill({ contentType: 'application/javascript', body: stub });
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        url.hostname === 'graphql.anilist.co'
          ? { data: { Page: { media: [], pageInfo: { hasNextPage: false } }, Media: null } }
          : { data: [], results: [] },
      ),
    });
  });
  await page.clock.setFixedTime(new Date(Date.now() + skew));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await page.waitForFunction(() => document.getElementById('mobile-sync-status'));
}
