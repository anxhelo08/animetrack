# AnimeTrack

AnimeTrack 13.9.0 ndjek anime, seriale dhe filma, me bibliotekë personale, progres episodesh, kalendar, profile dhe sinkronizim mes pajisjeve.

**Live:** https://animetrack-flax.vercel.app/ · **Ndryshimet:** [CHANGELOG.md](CHANGELOG.md) · **Siguria:** [SECURITY.md](SECURITY.md)

## Zhvillimi lokal

Përdor Node 22 sipas `.nvmrc`:

```sh
npm ci
npm run dev
```

Për kontroll para publikimit:

```sh
npm run lint
npm run format:check
npm run audit
npm test
```

Testet në shfletues përdorin `npm run test:e2e` pasi instalohet shfletuesi Playwright. CI kontrollon desktop Chromium dhe iPhone në Chromium/WebKit.

## Konfigurimi

`src/config.js` përmban URL-në e projektit Supabase dhe vetëm çelësin publik publishable. Konfigurimi fiksohet gjatë ndërtimit; përdoruesit nuk e ndryshojnë përmes UI-së ose localStorage. URL-të e kthimit për emailin duhet të përputhen me domenin live në Supabase Auth. Asnjë service-role key ose sekret nuk vendoset në shfletues.

Funksionet push në `supabase/functions/` përdorin sekretet e mjedisit Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANIMETRACK_CRON_SECRET`, `VAPID_PUBLIC_KEY` dhe `VAPID_PRIVATE_KEY`. Këto konfigurohen vetëm në server. Migrimet ekzistuese ndodhen në `supabase/migrations/`; Baseline-i i plotë ndodhet në `supabase/baseline/`. Për një databazë bosh Supabase, zbato baseline-in dhe pastaj vetëm migrimin `20260930112836_server_security_139.sql`; mos rizbato migrimet historike mbi baseline-in. Në databazën ekzistuese zbato vetëm migrimin e ri. `npm run test:db` përdor vetëm një databazë lokale bosh me emrin `animetrack_security_test`. CI provon rikrijimin, izolimin RLS dhe `supabase db lint`.

## Arkitektura dhe ruajtja

- `src/main.js` nis aplikacionin dhe ngarkon SDK-në Supabase nga npm.
- `src/app.js` mban rrjedhën kryesore të bibliotekës dhe llogarisë; `src/modules/` përmban funksionet shtesë.
- `safe-html.js` kontrollon të gjitha shkrimet HTML. Template-t e rinj përdorin escape automatik; renderer-at ekzistues sanitizohen në kufirin DOM.
- Biblioteka personale sinkronizohet me Supabase, me kopje lokale rikuperimi. AniList/MAL token-at ruhen të enkriptuar në server, në `anime_provider_credentials`, pa akses për rolet e shfletuesit. `anime-account` kryen eksport/fshirje dhe thirrje të kufizuara drejt provider-ave. Enkriptimi lidhet me service-role key; pas rotacionit kërkohet rilidhje e provider-ave. Përdoruesi mund të zgjedhë lexim vetëm me username.
- Vite ndërton asetet me hash në `dist/`. Service worker-i mbështet instalimin PWA dhe cache-in e aplikacionit.

## Publikimi

```sh
npm run build
npm run preview
```

Vercel përdor `npm run build`, shërben `dist/` dhe vendos politikat e sigurisë nga `vercel.json`. Degët e zhvillimit krijojnë preview; `main` publikon në domenin kryesor. Përfundo një update vetëm pasi testet të kalojnë, deployment-i production të jetë `READY` dhe domeni kryesor të shërbejë versionin e ri.

## Statusi i kandidatit 13.9

Shiko `RELEASE_13.9_REVIEW.md` për verifikimet dhe kushtet e publikimit. Kodi i këtij kandidati ende nuk është publikuar live.
