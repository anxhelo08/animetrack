import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
/* Static security regression checks; no production users or passwords touched. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=read('src/app.js'),html=read('index.html'),db=read('supabase/migrations/20260927121525_animetrack_122_security_permissions_and_queue_guard.sql'),hardening=read('supabase/migrations/20260929164949_animetrack_136_security_hardening.sql');
const headers=JSON.parse(read('vercel.json')).headers[0].headers;
const header=name=>headers.find(h=>h.key.toLowerCase()===name.toLowerCase())?.value||'';
test('CSP prohibits executable objects, third-party embedding and foreign scripts',()=>{
 const v=header('Content-Security-Policy');
 for(const directive of ["default-src 'self'","script-src 'self' https://cdn.jsdelivr.net","object-src 'none'","base-uri 'self'","frame-ancestors 'none'","worker-src 'self'","form-action 'self'"])assert.ok(v.includes(directive),directive);
 assert.ok(!v.includes("'unsafe-eval'"));assert.ok(!v.includes("script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'"));
});
test('anti-clickjacking, MIME, private referrer and restricted browser permissions',()=>{
 assert.equal(header('X-Frame-Options'),'DENY');
 assert.equal(header('X-Content-Type-Options'),'nosniff');
 assert.equal(header('Referrer-Policy'),'no-referrer');
 assert.match(header('Permissions-Policy'),/camera=\(\).*microphone=\(\)/);
});
test('only pinned external authentication script and separate public configuration',()=>{
 assert.match(read('src/main.js'),/import\("\.\/config\.js"\)/);
 assert.match(html,/supabase-js@2\.58\.0/);
 assert.doesNotMatch(html,/<script>\s*window\./);
 const conf=read('src/config.js');
 assert.match(conf,/window\.ANIMETRACK_CONFIG/);
 assert.doesNotMatch(conf,/sb_secret_|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
 assert.match(read('src/sw.js'),/precacheAndRoute\(self\.__WB_MANIFEST/);
});
test('browser-owned content is HTML escaped',()=>{
 const m=core.match(/function escapeHTML\(s\)\{[^\n]+\}/);
 assert.ok(m,'central escape helper');
 const escaped=vm.runInNewContext('(()=>{'+m[0]+';return escapeHTML(\'"><img src=x onerror=alert(1)> &\')})()',{}).toString();
 assert.ok(escaped.includes('&lt;img'));
 assert.ok(!escaped.includes('<img'));
 assert.ok(!escaped.includes('"'));
});
test('untrusted poster schemes cannot become javascript URLs',()=>{
 const m=core.match(/function validPoster\(s\)\{[^\n]+\}/);assert.ok(m);
 const check=vm.runInNewContext('(()=>{'+m[0]+';return validPoster})()', {URL});
 assert.equal(check('javascript:alert(1)'),'');assert.equal(check('data:text/html,<script>x</script>'),'');assert.match(check('https://example.com/x.png'),/^https:/);
});
test('cloud account and local key are derived from authenticated user ID',()=>{
 assert.match(core,/\.eq\('user_id',uid\)\.maybeSingle\(\)/);
 assert.match(core,/KEY='animetrack_user_'\+uid/);
 assert.match(core,/if\(accountUser\?\.id!==uid\)return/);
});
test('signup does not claim delivery or create duplicate user confirmation UI',()=>{
 assert.match(core,/data\.user\.identities\.length===0/);
 assert.match(core,/Kjo adresë mund të jetë regjistruar më parë/);
 assert.match(core,/kjo nuk garanton mbërritjen e emailit/i);
 assert.match(core,/at116EmailIssue/);
});
test('password reset and confirmation email resend have cooldowns',()=>{
 assert.match(core,/at116ResetAt\+60000/);
 assert.match(core,/at116ResendAt\+60000/);
 assert.match(core,/resetPasswordForEmail/);
});
test('RLS bypass via TRUNCATE is explicitly revoked for authenticated users',()=>{
 for(const table of ['anime_push_reminders','anime_push_subscriptions'])assert.ok(db.includes('revoke truncate, references, trigger on table public.'+table));
});
test('untrusted comment/report inserts cannot forge moderation or timestamps',()=>{
 assert.match(db,/grant insert \(user_id, episode_key, author_name, body, is_spoiler, parent_id\)/);
 assert.match(db,/grant insert \(comment_id, reporter_id, reason\)/);
});
test('only server push dispatcher can modify claim and sent markers',()=>{
 assert.match(db,/new\.claimed_at is distinct from old\.claimed_at/);
 assert.match(db,/new\.sent_at is distinct from old\.sent_at/);
 assert.match(db,/if current_user = 'authenticated'/);
 assert.match(db,/before insert or update/);
 const fn=read('supabase/functions/anime-push-dispatch/index.ts');
 assert.match(fn,/safeEqual\(/);assert.match(fn,/X-Cron-Secret/);assert.match(fn,/permittedEndpoint/);
 assert.doesNotMatch(fn,/console\.log\([^)]*SERVICE_ROLE/);
});
test('owners and moderators remain separate permissions in tracked SQL',()=>{
 const file=read('supabase/migrations/20260926154500_private_friend_rpc_hardening_112.sql');
 assert.match(file,/auth\.uid\(\)/);
 assert.match(core,/from\('anime_libraries'\)/);
 assert.match(read('src/modules/moderation.js'),/anime_moderators/);
});

test('13.6 social and push tables deny anonymous access while retaining RLS',()=>{
 for(const table of ['anime_profiles','anime_friendships','anime_push_reminders','anime_push_subscriptions']){
  assert.ok(hardening.includes('alter table public.'+table+' enable row level security'));
  assert.ok(hardening.includes('revoke all on table public.'+table+' from anon'));
 }
});

test('13.6 SECURITY DEFINER helpers use an immutable search path and authenticate the caller',()=>{
 assert.match(hardening,/security definer[\s\S]*set search_path = ''/i);
 assert.match(hardening,/me uuid := \(select auth\.uid\(\)\)/);
 assert.match(hardening,/if me is null then[\s\S]*Authentication required/);
 assert.match(hardening,/revoke all on function animetrack_private\.find_friend_by_handle\(text\) from anon/);
 assert.match(hardening,/revoke all on function animetrack_private\.request_friend_by_handle\(text\) from anon/);
});

test('13.6 API metadata crosses a DOMPurify boundary before UI rendering',()=>{
 const pkg=JSON.parse(read('package.json')),security=read('src/modules/security.js');
 const apiModules=['movies.js','filler.js','rich-details.js','tv.js','franchise-engine.js','recommendations.js'].map(name=>read('src/modules/'+name));
 assert.equal(pkg.dependencies.dompurify,'3.4.16');
 assert.match(security,/DOMPurify\.sanitize/);
 for(const source of apiModules)assert.match(source,/ATSecurity136\?\.text/);
 assert.match(core,/ATSecurity136\?\.text/);
});

test('dist stays outside source control and production headers block framing and MIME sniffing',()=>{
 const ignored=read('.gitignore');
 assert.match(ignored,/(^|\n)dist\/(\n|$)/);
 assert.equal(header('X-Frame-Options'),'DENY');
 assert.equal(header('X-Content-Type-Options'),'nosniff');
 assert.match(header('Content-Security-Policy'),/frame-ancestors 'none'/);
});
