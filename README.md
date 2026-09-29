# AnimeTrack 13.5 — MAL / AniList Live Sync

**Versioni publik:** 13.5 · **package version:** 13.5.0. Live Sync lidh progresin e AnimeTrack me AniList dhe MyAnimeList pa futur token-at në Supabase.

13.5 shton sync të kontrolluar me AniList dhe MyAnimeList: progress, status dhe rating krahasohen me baseline lokal; ndryshimet një-anëshe mund të sinkronizohen automatikisht, ndërsa konfliktet kërkojnë zgjedhjen e përdoruesit.

### Përditësimet aktuale

## AnimeTrack 13.5 · MAL / AniList Live Sync
- Faqja e re Live Sync lidh AniList dhe MyAnimeList me username read-only ose access token për two-way sync.
- Access token-at ruhen vetëm në localStorage të pajisjes dhe nuk futen në Supabase ose payload-in cloud të bibliotekës.
- AniList përdor MediaListCollection për listën dhe SaveMediaListEntry për progress/status/rating; OAuth implicit mund të përdoret kur vendoset AniList Client ID.
- MyAnimeList write sync përdor një Vercel proxy same-origin që përcjell vetëm token-in e kërkesës; serveri nuk e ruan token-in. Pa token, MAL username mund të lexohet përmes Jikan.
- Motori mban baseline lokal për çdo media ID. Nëse vetëm provider-i ndryshon bëhet Pull; nëse vetëm AnimeTrack ndryshon bëhet Push; nëse ndryshojnë të dy, hyrja shënohet Conflict dhe nuk mbishkruhet automatikisht.
- Remote-only titujt importohen vetëm gjatë Sync manual; auto-sync nuk shton ose fshin tituj pa ndërhyrjen e përdoruesit.
- Progress-i llogaritet vetëm nga vargu vazhdues i episodeve 1..N, që të mos dërgohet progres i rremë kur biblioteka ka episode të kapërcyera.
- Rating-u i sezonit nga Franchise Timeline 2.0 përdoret si rating i provider-it; për anime me një pjesë përdoret rating-u i përgjithshëm si fallback.
- Auto Live Sync kontrollon vetëm ndryshime të sigurta afërsisht çdo 10 minuta kur aplikacioni është aktiv dhe online.
- Profile page në desktop/mobile ka shortcut për Live Sync dhe tregon nëse MAL/AniList janë lidhur.


## AnimeTrack 13.4 · Rich Details / Cast / Staff
- Çdo detail page ka seksion Rich Details me metadata shtesë, studio/production, zhanre/tags, trailer kur burimi e ofron, cast dhe staff.
- Anime përdorin grafikun e AniList për staff, voice actors, studio dhe profile njerëzish.
- Seriale TV përdorin TVMaze cast/crew dhe person cast/crew credits.
- Filmat përdorin TMDB credits + person combined credits kur TMDB Read Access Token është lidhur; pa token ruhen emrat bazë nga metadata ekzistuese.
- Klikimi mbi aktorin/regjisorin hap profil brenda AnimeTrack me foto, rol, bio/fakte dhe deri në 30 vepra të tjera.
- Klikimi mbi një vepër tjetër hap direkt titullin në AnimeTrack kur ka ID kanonike; TMDB TV kalon në kërkimin universal që të zgjidhet versioni TVMaze pa krijuar duplikate.
- Titujt që janë tashmë në bibliotekë shënohen “Në bibliotekë” në filmografi dhe hapen direkt.
- Rich metadata cache-ohet lokalisht për 24 orë dhe nuk ndryshon progresin ose payload-in personal cloud.


## AnimeTrack 13.3 · Where to Watch
- Çdo faqe detaji ka seksionin “Ku mund ta shoh?” me availability që rifreskohet sipas titullit.
- Anime përdorin linket zyrtare të streaming nga AniList dhe fallback MyAnimeList/Jikan pa API key.
- Filmat dhe serialet përdorin TMDB watch/providers sipas rajonit; providerët ndahen në abonim, falas, reklama, qira dhe blerje.
- Rajoni ruhet në preferencat cloud të përdoruesit; default-i është Shqipëri (AL) dhe mund të ndryshohet nga faqja Where to Watch ose detajet.
- TMDB Read Access Token mbetet vetëm në pajisje dhe nuk dërgohet në Supabase.
- TVMaze mund të zgjidhet në TMDB përmes IMDb ID kur është e mundur; fallback është kërkimi konservativ me titull/vit.
- Availability cache-ohet lokalisht për 12 orë që të ulen thirrjet e panevojshme në API.
- Faqja e re “Ku ta shoh” në desktop tregon bibliotekën dhe providerët e kontrolluar së fundmi.
- Të dhënat TMDB watch providers shfaqin attribution JustWatch sipas kërkesës së TMDB.


## AnimeTrack 13.2 · Diary
- Diary ndërtohet automatikisht nga episodet, filmat dhe rewatches që regjistron si të parë.
- Hyrjet grupohen sipas ditës dhe tregojnë sezonin/episodin, orën, first watch/rewatch dhe media type.
- Çdo hyrje mund të ketë rating 0.5–10, shënim privat dhe datë/orë të korrigjueshme.
- Filtra për Anime / Seriale TV / Filma, First Watch / Rewatch, muaj dhe kërkim me tekst.
- Përmbledhje me aktivitetin e muajit, ditët aktive, mesataren e rating-eve dhe kohën e përafërt, plus heatmap 30-ditor.
- Ndryshimi i datës në Diary përditëson Statistikat dhe Wrapped sepse përdoret i njëjti historik kanonik.
- Diary është i disponueshëm si faqe desktop dhe si tab i pestë në navigimin mobile.
- Metadata e Diary ruhet në payload-in ekzistues cloud, kështu që PC ↔ mobile sinkronizohet pa migrim databaze.


## AnimeTrack 13.1.a · Build & Repository Cleanup
- Vite 8 prodhon automatikisht JavaScript/CSS me content hash; nuk përdoren më emra burimi si `pro-storage-1274.css` ose `pro-movies-12150.js`.
- Kodi që editohet jeton në `src/`; `dist/` është output i gjeneruar dhe nuk ruhet në Git.
- Browser E2E përdor vetëm Playwright Test për desktop Chromium, iPhone Chromium dhe iPhone WebKit/Safari.
- CI është reduktuar në `ci.yml` plus workflow-in manual të ikonave.
- Të gjithë `RELEASE_*.md` janë konsoliduar në `CHANGELOG.md` sipas Keep a Changelog.
- Mekanizmi historik `.release/*.b64` është hequr; ishte mekanizëm Git patch, jo runtime OTA. Git history ruan release-et e vjetra pa mbajtur payload-e Base64 aktive.
- Service Worker nuk liston më chunk-et me emra manualë; cache-on asset-et e hash-uara në runtime.

## AnimeTrack 13.1.0 · Franchise Timeline 2.0
- Franchise Timeline ka pamje të re lineare me çdo sezon, film, OVA dhe special në rend publikimi.
- Çdo pjesë ka rating personal direkt në timeline, progres, datë publikimi dhe score komuniteti.
- Përmbledhja e franchise-s tregon mesataren e pjesëve të vlerësuara dhe pjesën me notën më të lartë.
- Story Arcs mund të krijohen manualisht me interval episodesh, rating dhe shënim; klikimi te arc-u të çon direkt te episodi i parë.
- Arc ratings dhe season ratings ruhen në payload-in compact të Supabase dhe sinkronizohen PC ↔ mobile.
- Rindërtimi i franchise-s TV ruan arc ratings dhe rating-un e çdo sezoni.
- Versioni i Franchise Schema kalon në 13.1.0 që strukturat ekzistuese të kontrollohen pa humbur progresin.

## AnimeTrack 13.0.0 · Online-first Performance
- Supabase mbetet kopja kanonike e llogarisë, por payload-i online tani ruan vetëm state-in personal dhe metadata minimale që duhen për bibliotekën. Metadata e rëndë e episodeve rigjenerohet sipas nevojës.
- Shkrimi PC/iPhone nis pas ~120 ms në vend të debounce-it 1.1 s dhe përdor payload compact për upload.
- Kur Realtime dërgon një rresht të plotë nën limitin e payload-it, pajisja tjetër aplikon ndryshimin direkt nga WebSocket pa bërë një GET të dytë të gjithë bibliotekës.
- Metadata e pasur që ekziston tashmë në pajisje ruhet gjatë një update-i Realtime; progresi, statuset, ratings, notes, favorites, lists dhe history nga cloud mbeten autoritative.
- Script-et e faqes janë deferred dhe faqja bën preconnect me Supabase/CDN; Service Worker 13.0 nuk dështon i gjithë instalimi nëse një asset opsional nuk mund të precache-ohet.
- Formati i vjetër 12.x lexohet normalisht. Pas shkrimit të parë nga 13.0, biblioteka kalon automatikisht në payload-in compact të ri.


- Franchise Timeline: sezonet, filmat, OVA-t dhe specialet kryesore të lidhura me PREQUEL/SEQUEL bashkohen në një kartë dhe renditen sipas datës së publikimit.
- “Përditëso serinë”: zëvendëson ndarjen e paqartë si TV dhe ruan progresin gjatë rindërtimit të serisë.
- Seriale TV: familjet me të njëjtin titull bazë (p.sh. Dexter + vazhdimet) grupohen automatikisht dhe kanë rifreskim nga TVMaze.
- Sezonet: pamje moderne me filtra realë AniList për Drama, Thriller, Isekai dhe zhanre të tjera.
- Anime Wrapped: pamje e re, statistika sipas periudhës dhe medalje për arritje të mbështetura te historiku personal.
- Episode filler: shenjë e verdhë vetëm kur klasifikimi vjen nga të dhëna Jikan të verifikuara ose përcaktohet manualisht; statusi i panjohur nuk shënohet automatikisht si kanonik.
- Biblioteka dhe cloud: ruajtje lokale e sigurt, journal për ndryshimet në pritje, mbrojtje nga fshirja e cache-it të progresit dhe rifreskim pa prishur format.
- PC dhe iPhone: teste automatike të funksioneve kryesore para publikimit.

---

Aplikacion personal për ndjekjen e animeve, episodeve dhe filmave, me llogari dhe bibliotekë cloud.

**Faqja:** https://animetrack-flax.vercel.app  
**Deploy:** Vercel automatikisht nga `main` në `anxhelo08/animetrack`.

## Funksionet
- Bibliotekë për çdo përdorues, sezone të grupuara, progres sipas episodeve të transmetuara dhe rewatch i ndarë.
- AniList / Jikan / TVmaze për metadata, përshkrime dhe foto episodeve kur burimet i ofrojnë.
- Inbox i organizuar sipas kategorive, lexo/fsheh/çaktivizo llojin, kujtesa kalendari, episode, sezone, komente dhe miq.
- Discovery: rekomandime nga notat/zhanret/favorites, filtra sipas humorit dhe gjatësisë, perla nën radar, filma, surpriza, arsyetim i sugjerimit dhe fshehje për çdo llogari.
- Kalendar javë/muaj/timeline, filtra personalë, episode të paregjistruara, kujtesa in-app dhe eksport .ics; Wrapped me eksport PNG.
- Profile me header personal, 12-javë heatmap, top anime, zhanre, rewatch dhe badges; privatesi me zgjedhje te përdoruesit, kërkesa miqësie dhe krahasim bibliotekash.
- Panel moderimi vetëm për llogarinë e autorizuar.
- PWA e instalueshme kur shfletuesi e mbështet. Funksionet cloud kërkojnë lidhje interneti.

**Kujtesat in-app janë funksionale.** Web Push jashtë aplikacionit është i përgatitur në kod, por nuk aktivizohet derisa migrimi, funksionet dhe çelësat VAPID të publikohen në mënyrë të sigurt. Orari i një episodi tregon transmetimin e njoftuar, jo garanci për disponueshmërinë në një platformë streaming.

## Kryefaqja 10.4
- Watch-first Home: karta e madhe “ku e le” me backlog, episodin e radhës dhe episode të shpejta; sesion personal deri në 6 anime, filtrat Watching, episode të sapotransmetuara, rekomandime, kalendar dhe inbox.
- Mobile-first: bottom navigation me Home/Bibliotekë/Kalendar/Zbulo/Profil, cards horizontale swipe/snap dhe veprime të optimizuara për një dorë.
- Statistikat e mëdha dhe objektivi javor janë te Profili im → Statistikat e mia. Elementet e vjetra të Home ruhen të montuara për pajtueshmëri me funksionet ekzistuese, por janë të fshehura vizualisht.
- Sesioni ruhet në preferencat e bibliotekës personale dhe mbijeton rikthimin nga cloud. Veprimet mbi episode kërkojnë klikim të përdoruesit.

## Përditësimet 10.4.1
- Karta kryesore është kompakte në desktop; kartat “Vazhdo shikimin” tregojnë me madhësi të qartë S/EP dhe veprimin e drejtpërdrejtë `✓ +1 episod` (veçmas nga hapja e detajeve).
- Ndryshimet e bëra nga përdoruesi përditësojnë menjëherë Home, kalendarin, profilin dhe njoftimet. Orari publik kontrollohet çdo 30 minuta kur aplikacioni është aktiv dhe përsëri kur rikthehesh; katalogu i gjerë mbetet me cikël ditor. Kjo është *near-live polling*, jo push nga AniList.
- Sinkronizimi i heshtur nga cloud nuk mbishkruan ndryshime lokale të paruajtura dhe nuk e nxjerr përdoruesin nga faqja aktuale. Preferencat e sesionit/kujtesave ruhen gjatë cloud reload. Statusi i orarit shfaqet në Home.

- Kur publikohet një version i ri PWA, shfaqet një banner “Përditëso tani”. Rifreskimi bëhet nga përdoruesi dhe nuk lejohet gjatë sinkronizimit të ndryshimeve lokale të paruajtura.

## iPhone 10.5
- Ekrani i parë në telefon është feed-i i episodeve (Për t’u parë / Sapo dolën / Së shpejti), jo dashboard desktop. Navigimi i poshtëm: Episodet, Kalendari, Zbulo, Biblioteka, Unë.
- Progres +1 episod me një prekje, detaje veçmas, rifreskim manual, badge i njoftimeve dhe kartë instalimi Safari. Përdor të njëjtën bibliotekë të sigurt Supabase; nuk krijohet databazë e dytë.
- Instalim: Safari → Share → Add to Home Screen → Open as Web App → Add. Ky është PWA i instalueshëm, jo paketë IPA/App Store. Aplikacioni kërkon internet për shërbimet cloud dhe katalogun; njoftimet jashtë aplikacionit kërkojnë backend Web Push të veçantë.

## PC 10.6
- Watchlist në PC: kërkim i menjëhershëm në titull/zhanër, shfaqje progresive përtej 6 animeve dhe zhbërje e veprimit të fundit `+1 episod` me verifikim të historikut.
- Këto kontrolle janë vetëm në desktop: struktura e iPhone është e izoluar dhe ruan feed-in e episodeve.
- Nuk ka ndryshim të skemës së Supabase, migrim të bibliotekës apo ndryshim të statusit automatik pa veprim të përdoruesit.

## Quality 10.7
- Markimi i një episodi ruhet atomikisht në bibliotekën lokale: nëse ruajtja dështon, rikthehen progresi dhe historiku pa shfaqur sukses të rremë.
- Zhbërje e shpejtë edhe në iPhone, me kontroll të llogarisë, sezonit dhe episodit dhe pa prekur hyrje të tjera.
- Kalendar, profil, Home dhe inbox përditësohen pas shënimit; mosfunksionimi i një widget-i në Home nuk bllokon pjesët e tjera dhe ka buton Riprovo.
- Status i qartë ruajtjeje dhe rifreskimi; humbja e internetit raportohet si e tillë. Cloud provon sërish ruajtjen e ndryshimeve në pritje kur rikthehet lidhja; ato nuk mbishkruhen nga pull automatik.
- Njoftimet vazhdojnë të jenë brenda aplikacionit, jo Web Push në sfond.

## Episode & Franchise Hubs 10.8
- Franchise Hub brenda detajeve të anime-s: sezone/filma/speciale të organizuara si karta me progres dhe episodin e radhës. Tituj të veçantë me rrënjë të verifikuar të njëjtë lidhen vizualisht, pa ndryshuar ose fshirë regjistrimet e bibliotekës.
- Rifreskimi automatik i metadatave tani përditëson vetëm kartën aktuale; bashkimi i regjistrimeve të ndara bëhet vetëm nga komanda ekzistuese e shprehur “Bashko sezonet”. Nuk niset më bashkim automatik gjatë hyrjes.
- Episode Hub ruan përshkrimin/foton e verifikuar, shënimet private dhe komentet ekzistuese me mbulim spoiler; shton tab-e Episodi/Diskutimi dhe kalim të qartë te episodi para/pas edhe në sezonin tjetër kur është transmetuar.
- I njëjti progres për PC/iPhone, pa ndryshuar skemën Supabase apo krijuar databazë të re.

## Kalendari inteligjent 10.9
- “Kjo javë për ty” në PC dhe iPhone: episode të ardhshme nga anime që ndjek, pa ato tashmë të shënuara. Kufiri 7 ditë dhe zona kohore e pajisjes.
- Për çdo episod: pa kujtesë, në transmetim, 10/30/60 minuta ose 1 ditë përpara. Koha e zgjedhur ruhet në cloud dhe përfshihet në alarmet e eksportit .ics.
- Inbox-i llogarit fillimin e kujtesës sipas zgjedhjes reale, përfshirë 0 minuta. Aktivizimi është individual.
- Web Push për Home Screen iPhone është opt-in dhe i kushtëzuar nga serveri. Kodet SQL me RLS, Edge Functions dhe cron gjenden te `supabase/`, por **nuk janë aplikuar në projektin live**. Asnjë çelës privat nuk është në frontend.
- Për t’u publikuar: vendos në Supabase `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` dhe `ANIMETRACK_CRON_SECRET` (32+ karaktere); apliko migrimin; deploy `anime-push-config` me JWT dhe `anime-push-dispatch` pa JWT vetëm sepse kontrollon sekretin cron në kod; aktivizo cron sipas skedarit `supabase/cron/anime-push-109.sql`; kontrollo me një abonim test para ndezjes te përdoruesit.
- Deri në konfigurimin e serverit, UI shfaq saktësisht që Web Push nuk është aktiv dhe nuk kërkon leje njoftimesh.
- 10.8 Episode/Franchise, 10.7 ruajtja e sigurt dhe 10.6 PC ruhen të gjitha.

## Clean Series & My Lists 11.0
- Removed the Franchise Hub visual section, inferred linked-title cards, and duplicate season carousel entirely. Existing native season tabs and Episode Hub (next/previous episode, comments and spoiler controls) remain.
- Private named custom lists (12 lists, 150 anime each), created from Library → Listat e mia or from anime detail → Shto në listë. Users can add/remove anime without modifying watch history or status, rename/delete a list without deleting its anime.
- Lists are persisted in validated `customLists` preferences, including cloud sync. One-click optional share contains anime titles only; it never includes private notes, ratings, watch history or a private profile URL.
- The 10.9 smart airing calendar and staged Web Push backend remain unchanged; no additional database migrations and no Production deployment.

## iPhone 11.0.1 — safe area dhe prekje
- Zona e sigurt rreth Dynamic Island/baterisë dhe Home Indicator aplikohet në të gjitha dritaret (detajet e animes, episodet, hyrja, konfirmimet). Butoni Kthehu ka sipërfaqe të paktën 44px dhe pozicion të sigurt në header.
- Dritaret mbulojnë siç duhet navigimin e poshtëm; nuk bllokohen butonat nga bar-i i telefonit.
- `touch-action: manipulation` në sipërfaqe ndërvepruese pengon double-tap zoom aksidental, por lë të lirë pinch-to-zoom për aksesueshmëri; input-et kanë minimum 16px.
- Karta/tekstet dhe butonat e Home-it mobil u rregulluan për gjerësitë 320–430px; status bar, fundi dhe peizazhi respektojnë safe-area.
- Nuk ndryshon databazën ose progresin e përdoruesit; përfshin të gjithë 11.0 dhe heqjen e Franchise Hub.

## Arkitektura
`src/`: kodi burimor i aplikacionit. `src/app.js` është core-i, `src/modules/` mban veçoritë dhe `src/styles/` mban CSS burimor.  
`src/main.js`: entrypoint i Vite; ngarkon CSS, konfigurimin, modulet dhe në fund core-in në rendin e kërkuar.  
`public/`: skedarë statikë që kopjohen pa transformim (`sw.js`, manifest dhe ikonat PWA).  
`dist/`: build-i i prodhimit i gjeneruar nga Vite me `assets/<name>.<content-hash>.js/css`; nuk komitohet në repository.  
`tests/unit/`: regresione të shpejta Node. `tests/e2e/`: Playwright Test për desktop dhe iPhone Chromium/WebKit.  
`CHANGELOG.md`: burimi i vetëm i historikut të release-eve.  
`.github/workflows/ci.yml`: unit + build + matrix E2E + paketimi i ZIP-it të testuar.

Për zhvillim lokal: `npm install`, pastaj `npm run dev`. Për verifikim: `npm test` dhe `npm run test:e2e`. Build-i final krijohet me `npm run build`.

## Ruajtja dhe siguria
Supabase Auth dhe RLS ndajnë bibliotekat personale. Profili nis privat; lista e përmbledhur ndahet publikisht vetëm pas aktivizimit nga përdoruesi ose me miqësinë e pranuar. Komentet dhe raportimet ruhen në tabela të veçanta. Në HTML ka vetëm publishable key; **mos vendos kurrë service-role/secret key në repo**.

Deploy i kodit nuk duhet të fshijë bibliotekat; për siguri eksporto periodikisht kopje rezervë.

<!-- Production deployment sync: AnimeTrack 11.0.1 iPhone PWA release. -->

## Korrigjimi 10.5.1 në iPhone
- Feed-i i episodeve nuk fshihet më nga rregullat e vjetra të dashboard-it; vetëm pamja desktop fshihet në mobile.
- Test real shfletuesi për hapjen e feed-it, kalimin +1 episod dhe pesë tab-et në Chromium dhe Safari WebKit.
- Një rekord i paplotë episodi nuk e bllokon tërë aplikacionin; shfaqet veprim rikuperimi.

<!-- Production redeploy: AnimeTrack 11.0.1 iPhone blank-feed hotfix. -->

## AnimeTrack 11.1 — Phone + Friends & Watch polish
- iPhone: refreshed graphite/dark design inspired by the compact media-app layout, safe-area-aware fixed navigation, larger tappable episode watch buttons, explicit undo.
- Friends: public username/display-name search, 340ms debounce, clearer incoming/outgoing/accepted lists, request cancellation, accept/decline and privacy-preserving library comparison. Profile and phone feed link directly to Friends. Requires existing `anime_profiles` and `anime_friendships` RLS; does not expose private profiles in search.
- Desktop: redesigned social/profile components, watch cards, episode buttons and interactive focus states.
- Cloud: independent module recovery so a social feature failure cannot prevent other account widgets from loading; full-season marking rolls back if local persistence fails.
- No database schema changes. Web Push remains staged, not enabled by this release.


## AnimeTrack 11.2 — Pro Experience (iPhone + PC)
- iPhone: personal glance me episodet gati, kërkim në feed, renditje Të fundit / Më shumë EP / A–Z, fushë kërkimi 16px dhe veprime të arritshme me prekje. Kërkimi/renditja nuk ndryshojnë të dhënat.
- Desktop: kërkim global brenda aplikacionit me Ctrl/⌘+K ose `/`, navigim me shigjeta/Enter/Escape, hapje direkte e animeve nga biblioteka, focus trap dhe etiketa accessibility.
- Miqtë: kutia “Kopjo ftesën”, kërkimi i saktë i username-it privat përmes RPC me output minimal, ftesë private me kërkesë eksplicite dhe pa shpërndarë snapshot, bio ose email; kërkimi i gjerë mbetet vetëm për profile publike. Respektohen kërkesat ekzistuese/refuzimet.
- Offline: njoftim i qartë kur humbet lidhja, pa pretenduar se cloud është sinkronizuar; version PWA cache `v1120-1`.
- Skedari i migrimit për ftesat private është `supabase/migrations/20260926153000_private_friend_invites_112.sql`. **Është aplikuar dhe verifikuar në projektin Supabase të lidhur (26.09.2026); për një projekt tjetër, ekzekuto migrimet sipas radhës.** Versioni më i vjetër mbetet i përdorshëm për kërkesat publike pa migrimin. RLS e bibliotekave dhe të dhënat ekzistuese nuk ndryshohen.
- `npm test` verifikon 11.2 dhe regresionet e mëparshme. E2E moderne janë te `tests/e2e/` dhe ekzekutohen me `npm run test:e2e` në Playwright.
- Ky ZIP është release source; publikimi në Vercel është hap më vete dhe nuk nënkuptohet nga ndryshimi i versionit në skedarë.

- Fortifikimi RPC: `supabase/migrations/20260926154500_private_friend_rpc_hardening_112.sql` zhvendos implementimin me privilegje në skemë private dhe mban vetëm wrapper-at SECURITY INVOKER në API-n publike.


## 12.15.3 · Cloud-first storage
Kur përdoruesi është i loguar, Supabase është kopja kanonike e bibliotekës. iPhone/PC ruan vetëm një recovery snapshot kompakt me progresin dhe të dhënat personale; metadata e episodeve që mund të shkarkohet sërish nuk kopjohet në localStorage.


## 12.15.3 · One franchise, one card
Anime franchises are deduplicated across AniList/MAL and TVMaze. AniList/MAL define season/movie chronology; TVMaze progress is bridged into that canonical timeline instead of creating another library card. Movies remain Film entries and never increment season numbering.


## 12.15.3 · Canonical Franchise Engine
Anime franchise structure now comes only from AniList relation IDs (with MAL only as a fallback metadata provider). Live-action TV franchise membership comes from Wikidata, while regular seasons/episodes come from TVMaze. TV specials never become numbered seasons. Global TV season numbering continues across sequel/revival shows in release order.


## 12.15.3 · Season Focus & Personal Timeline
Kur hap një titull, rreshti i sezoneve qendrohet automatikisht te pjesa ku ke mbetur dhe shfaq etiketën ‘KU E LE’. Çdo sezon/film mund të fshihet në mënyrë të kthyeshme nga timeline-i personal; pjesët e fshehura nuk numërohen në progres, sezonet ose episodin tjetër. Çdo pjesë shfaq përshkrimin e vet kur metadata është e disponueshme.


## 12.15.3 · Movies
Live-action movies are now a third first-class media type beside Anime and TV. TMDB is preferred when a local Read Access Token is configured; OMDb is the fallback. Movies use Watched / Plan to Watch, personal rating, favorites, notes, rewatch count, IMDb/TMDB ratings, runtime, director/cast and TMDB collection timelines. Movie watches sync with the same per-account Supabase library without inflating anime/TV episode counters.


## 12.15.3 · Movie search fallback
Movie search no longer requires a TMDB or OMDb credential. When neither provider is configured, or a configured provider returns no result, AnimeTrack searches Wikidata's public MediaWiki API and can save those movies as normal first-class movie entries. Exact titles such as Avengers: Endgame therefore appear even on a fresh device. TMDB and OMDb remain optional enrichment providers.


## 12.15.3 · Rich IMDb-ID movie fallback
Cinemeta is now the primary zero-key movie discovery source. It searches a large catalog keyed by IMDb IDs and provides posters, backgrounds, years, ratings and descriptions without requiring user credentials. Provider order is TMDB (when configured) → Cinemeta/IMDb ID → OMDb (when configured) → Wikidata. IMDb IDs remain the stable movie identity for deduplication.


## 12.15.3 · Cross-device cloud sync
Movie and library changes now use the existing Supabase Realtime publication for `anime_libraries`. A change saved on PC triggers a quiet pull on an already-open iPhone session, and vice versa. Movie add/watch/rewatch/rating/note actions request an immediate cloud flush instead of relying only on the generic delayed queue. Focus, pageshow, visibility return and a 30-second foreground safety poll provide fallback recovery when Realtime is interrupted. No database migration is required.
