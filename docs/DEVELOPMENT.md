# AnimeTrack

AnimeTrack 14.5.0 ndjek anime, seriale dhe filma, me bibliotekë personale, progres episodesh, kalendar, profile dhe sinkronizim mes pajisjeve.

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

- `src/main.js` ngarkon varësitë dhe thërret `startApp()` në mënyrë eksplicite.
- `src/core/` ndan modelin e bibliotekës, transportin e katalogut, lidhjet e UI dhe store-in me `getState`/`subscribe`. Store-i lexon gjendjen kanonike; nuk mban kopje të dytë. Njoftimi `saved` lëshohet vetëm pas ruajtjes së suksesshme.
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

## Verifikimi i 13.9

Shiko `docs/13.9-review.md` për verifikimet, kufizimet e OAuth dhe backup/PITR. Statusi aktual i testeve ndiqet në GitHub Actions; publikimi në serverin kryesor verifikohet në Vercel.

Njoftimet 13.10: shih [push-delivery.md](docs/push-delivery.md) për konfigurimin, riprovimet dhe kufizimet.

## Aksesueshmëria dhe provat vizuale

`tests/e2e/accessibility.spec.js` kontrollon WCAG AA me axe për hyrjen, regjistrimin, kryefaqen, bibliotekën dhe detajet. Provon hapjen/mbylljen me tastierë, kthimin e fokusit dhe butonat mobilë 44px. Screenshot-et e bibliotekës krahasohen me baseline të ruajtura në Git. Përditësoji vetëm pas kontrollit vizual: `npx playwright test tests/e2e/accessibility.spec.js --update-snapshots`. Testet automatike nuk zëvendësojnë provat me lexues ekrani.

## Përvoja e parë

Menuja ka pesë hyrje: Kreu, Biblioteka, Zbulo, Aktiviteti dhe Profili. Kalendari, listat dhe statistikat hapen nga seksioni përkatës. Llogaritë me bibliotekë bosh marrin një udhëzues me tre hapa; mund të kalohet dhe ruhet veçmas për çdo llogari në këtë pajisje. Rihapet te Profili → Cilësimet → Avancuar. Konfigurimi opsional i burimeve dhe lidhjet MAL/AniList janë në të njëjtin vend. Treguesi i ruajtjes ndan sinkronizimin, pritjen, mungesën e internetit dhe konfliktet. Provat e rrjedhës janë në `tests/e2e/product-experience.spec.js`.

## Organizimi i kodit

Modulet e reja përdorin importe dhe eksporte ESM. `features.js` dhe përvoja e produktit lidhen pa objekte globale. Adapterët e vjetër që përdoren ende nga shtesat ruhen gjatë migrimit gradual. `npm run typecheck` kontrollon JSDoc me `checkJs` dhe strict mode për store-in dhe delegimin e ngjarjeve; përfshihet në `npm test` dhe CI. Logjika e bibliotekës provohet drejtpërdrejt nga modulet, përfshirë sezonet e fshehura, episodet e ardhshme dhe metadatat private.

## IndexedDB dhe rikuperimi

Biblioteka, journal-i në pritje dhe revision-i kopjohen në një transaksion IndexedDB dhe verifikohen me SHA-256 pas leximit. Një kopje e mëparshme e verifikuar ruhet për rikuperim. Shkrimet sinkrone vazhdojnë të përdorin kopjen aktuale në localStorage si write-ahead journal: suksesi nuk shfaqet kur kjo ruajtje dështon. Migrimi nuk fshin bibliotekën aktive ose journal-in në pritje. Kur IndexedDB bllokohet, kjo kopje mbetet funksionale. Nëse kopja aktuale mungon, hapja lexon kopjen e verifikuar të kësaj llogarie nga IndexedDB.

Te Profili → Cilësimet → Avancuar mund të verifikosh ruajtjen, të shkarkosh kopjen e mëparshme për import dhe të pastrosh vetëm backup-et historike identike me kopjen e verifikuar. Kopjet e ndryshme, auth dhe ndryshimet në pritje mbahen. Fshirja e llogarisë heq kopjet IndexedDB; nëse databaza lokale nuk hapet, një marker pa të dhëna personale pengon rikthimin dhe kryen pastrimin në hapjen tjetër. Importi, eksporti, kopjet lokale dhe payload-et cloud kontrollohen për strukturë e madhësi përpara përdorimit. `tests/e2e/indexed-storage.spec.js` provon migrimin/rikuperimin dhe refuzimin e input-it të pavlefshëm në shfletues.

## Shpejtësia — 14.3

Modulet e pavarura, kontrolluesi dhe hapja e IndexedDB ngarkohen paralelisht; `startApp()` pret që varësitë dhe kopja lokale të jenë gati. Ditari dhe CSS-ja e tij ngarkohen kur hapet faqja, me riprovim kur ngarkimi dështon. Kërkimet publike AniList/Jikan/TVMaze dhe metadata e katalogut përdorin cache në memorie (100 hyrje, TTL 5 minuta), dedupe dhe cooldown 1–30 sekonda pas dështimit. Anulimi i një kërkimi nuk anulon një konsumues tjetër; kërkesat autentike dhe biblioteka nuk futen në këtë cache.

Planifikuesit ndalojnë timer-at kur skeda fshihet, nuk mbivendosin punën dhe rikontrollojnë kur ajo hapet. PWA përdor HTML, JS dhe CSS të të njëjtit version nga precache, pa pritur rrjetin gjatë navigimit; përditësimi aktivizohet nga veprimi i mbrojtur “Përditëso tani”. Cache mban tre versione të skedarëve publikë për skedat ende të hapura; API-të e llogarisë nuk ruhen në runtime cache. Posterët kryesorë kanë dimensione të deklaruara; posteri në detaje ngarkohet menjëherë.

CI kontrollon madhësinë e JavaScript (346000 B gzip gjithsej; 310000 B në nisje), ndërsa Lighthouse kontrollon LCP ≤4.5 sekonda, TBT ≤300 ms dhe JS ≤400 KB në tre hapje mobile të secilës prej katër faqeve publike. Raportet ruhen si artefakte CI; këto janë matje laboratorike të hapjes pa session dhe jo garanci për çdo pajisje apo bibliotekë.

## Sistemi vizual — 14.4

Cilësimet → Pamja e aplikacionit ofron temë të errët, të çelët dhe sipas pajisjes. Tema e errët mbetet zgjedhja fillestare; preferenca ruhet vetëm në pajisje dhe nuk përfshihet në bibliotekë, eksport apo cloud. `theme-color` dhe `color-scheme` ndjekin temën e zgjidhur. Fonti përdor stack sistemor, pa varësi nga një Inter i pangarkuar.

`src/styles/tokens.css` përcakton paletën, tipografinë, rrezet, hijet dhe shtresat. `src/design-system.mjs` përshtat ngjyrat legacy për temën e çelët me `light-dark()`, ruan paletën e errët dhe ngjyrat mbi foto/butonat kryesorë, kufizon blur-in në 8px dhe heq deklaratat identike brenda të njëjtit rregull. Familjet kryesore të breakpoints centralizohen në 760/900/1000px; ndërprerjet 980px unifikohen me 1000px. Rregullat dinamike të vjetra dhe `!important` që kontrollojnë gjendjet e UI mbahen kur nuk mund të hiqen në mënyrë të sigurt.

Tema e çelët kërkon shfletues modern me `light-dark()`. Kontrollet axe provojnë hyrjen, regjistrimin, kreun, bibliotekën dhe detajet në temën e çelët, krahas provave dhe screenshot-eve të temës së errët.


Web interaction checks: `tests/e2e/web-polish.spec.js` verifies that background refreshes retain the desktop next-episode card, Diary filters leave the viewport when scrolling, season selection scrolls to its episodes, and episode ratings/dates update the existing watch event without changing progress. The optional five-star panel stores ratings on the existing 10-point Diary scale. Unknown release dates cannot be selected. Film/TV discovery works without credentials through title and provider searches in Google; network metadata comes from TVMaze. Search links do not assert current subscription availability. Configured TMDB availability remains region-specific, with discovery as its error fallback.

Episode details use a centered compact card with the verified episode artwork, watched status, previous/next controls and a five-star rating. Personal ratings update the corresponding Diary event when the episode is currently watched, without adding watch events or changing progress. Existing notes, synopsis spoiler protection and discussions remain in the expandable details section. Where-to-watch links now open title/provider searches in Google in a new tab.

## Manga & Manhwa (14.8.0)

Desktop navigation adds a sixth reading destination with its own library, AniList MANGA search (JP/KR origins), and chapter diary. `readingLibrary` is a separate array in the existing per-account JSON payload; it never enters anime counts or watch history. The controller, import validation, compact cloud recovery, hydration, and conflict merge preserve it on all screen sizes. Phone navigation retains five destinations. Reading deletion uses a timestamped tombstone so conflict recovery cannot resurrect a removed title. Chapter journals merge by event ID; the latest read/unread events resolve progress.

Home spotlight keeps its 20-second deadline across hidden routes and catches up on return without running an offscreen timer. CSS camera animation positions are restored from a continuous clock after display:none. Dialogs, keyboard interactions, hidden browser tabs and reduced motion still pause automatic transitions.

### Reading controls (14.9.0)

Search keeps its toolbar and hero DOM nodes mounted while updating results. AniList is the primary catalog; MyAnimeList/Jikan is a fallback for missing matches or service failures. Provider identity is persisted for later count checks. No catalog guarantees every published title or a current count for ongoing publications.

Chapter controls support numeric filtering, ascending/descending order, bulk marking and optional preceding chapters. `volumeRanges` stores explicit `{volume,start,end}` intervals; AniList/Jikan boundaries are entered manually; verified MangaDex intervals can fill an empty map. Unknown totals remain unknown. New chapter checks fetch public metadata and preserve personal notes and reading history.

### Release discovery and preview (14.10.0)

Home requests AniList banner artwork and validated YouTube trailer IDs. No cover is stretched as a backdrop. The active desktop slide may load a muted, 20-second bounded YouTube privacy-enhanced embed, cropped to cover the backdrop. Cached missing trailer IDs are rechecked once; the player starts immediately and follows the story timeline, including when returning home. It is removed on hidden routes, tabs, modals, reduced motion, and user stop. CSP permits only the privacy-enhanced player host for frames; the HTML sanitizer still rejects arbitrary iframes. Playback depends on provider embedding and browser autoplay policies.

Reading checks up to eight stale ongoing titles sequentially while the reading view is visible. AniList/Jikan metadata is supplemented by MangaDex only after one exact title/alternate-title and original-language match, or a previously matched ID. The displayed ongoing count is the highest verified integer chapter; fractional/special chapters are not currently tracked. Volume boundaries come from aggregate metadata and never replace manually entered intervals. No match or provider failures retain existing data; an unknown count remains unknown.

Chapter release dates persist in `chapterReleases` (max 300). A known count increase without source dates uses a labelled discovery date, while an initial unknown count establishes a baseline. NEW expires strictly after seven days and does not extend on refresh or cross-device merge. Public chapter lookup is metadata only and does not host pages or scanlations.

Matjet, kontrolli ditor dhe konfigurimi i Search Console: [Matje dhe dukshmëri](MEASUREMENT-AND-DISCOVERY.md).
