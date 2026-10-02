# 14.9.0 — Përmirësime të leximit

- Kërkim i qëndrueshëm pa rinisje të animacionit dhe MyAnimeList si katalog rezervë.
- Renditje kapitujsh në të dy drejtimet, kërkim sipas numrit dhe shënim i gjithë kapitujve të njohur.
- Pyetje për kapitujt e mëparshëm, ndarje vëllimesh me intervale të përcaktuara dhe kontroll i kapitujve të rinj nga katalogu.
- Rifreskimi i cloud ruan faqen e leximit të hapur pas ruajtjes.
- Nëndarje të leximit poshtë navigimit me mouse ose tastierë dhe pamje më e përqendruar e detajeve.

# 14.8.0 — Manga & Manhwa për PC

- Seksion i gjashtë vetëm në desktop, me Leximet e mia, Zbulo dhe Ditari i leximit.
- Kërkim i veçuar nga anime/filmat; katalog AniList për manga japoneze dhe manhwa koreane, filtra dhe shtim manual.
- Progres kapitujsh e vëllimesh, statuse, nota, të preferuara, shënime personale dhe ditar për çdo kapitull.
- Bibliotekë leximi e veçuar në sinkronizim, kopje rezervë dhe rikuperim; të dhënat ruhen edhe në telefon pa shfaqur seksionin e PC-së.
- Animacione të buta me respekt për reduced motion; Anime Pulse në Kreu vazhdon të njëjtën kohë dhe kap vijimin kur kthehesh.

# 14.7.3

- Filmat nga kërkimi i shpejtë hapin detajet e filmit, edhe me Enter.
- Faqet e anime-ve ruajnë kërkimin e filmave në pritje; ndryshimi i titullit anulon burimet e kërkimit të vjetër.
- “Shiko të gjitha pjesët” shfaq familjen e katalogut edhe kur një pjesë është në bibliotekë, me shënim për pjesët e ruajtura.
- Historiku mobile dallon episodet e parë nga episodi i radhës dhe episodet e ardhshme.
- Etiketa shqip, ikona SVG dhe filtra të bibliotekës në një rresht horizontal me kontrolle të paktën 44 px.

# 14.7.2

- Mirëseardhje mobile me kolazh posterësh, gradient dhe buton Fillo në gjerësi të plotë.
- Hiqet butoni i ndalimit; animacionet hyrëse janë të shkurtra dhe respektojnë reduced motion.
- Google/Apple përdorin integrimin ekzistues; aktivizimi real kërkon kredencialet e provider-ëve.

# 14.7.1

- Mirëseardhja shfaqet para inicializimit të plotë për vizitorët e rinj; sesionet ekzistuese dhe kthimet OAuth presin verifikimin.

- Posterë origjinalë mbi 1400 px, të shërbyer nga faqja.
- Shfletim automatik i kartave, shigjeta, zgjedhje direkte, pauzë dhe respektim i reduced motion.
- Ekran hyrjeje me posterë në sfond dhe integrim OAuth Google/Apple që kontrollon aktivizimin e provider-ëve; aktivizimi real kërkon kredencialet në Supabase.
- Udhëzues konfigurimi në docs/social-auth.md dhe prova për ridrejtim të sigurt e provider-ë të çaktivizuar.

# 14.7.0

- Faqe publike mirëseardhjeje për vizitorët pa sesion, me karta anime të animuara, pamje mobile dhe hyrje/regjistrim të drejtpërdrejtë.
- Kontroll ndalimi të animacionit dhe respektim i reduced motion. Llogaritë aktive kalojnë direkt në bibliotekë.

# 14.6.1

- Yield between independent interface mounts to avoid combining catalogue, account and navigation initialization into long main-thread tasks.

- Refresh release metadata on first login after upgrading, bypassing the previous daily cache. Daily AniList queries include the last confirmed airing, with independent TVmaze and Jikan fallbacks.
- Reject old full-season estimates for ongoing anime. A dated future episode limits availability even when a TVmaze list is incomplete; watched history is retained without turning future episodes into released episodes.
- Verified anime TVmaze matches require a unique exact title/alias and premiere year, and are limited to a single TV track. Episode photos and summaries retain source labels.
- Add exact-episode MyAnimeList/Jikan video thumbnails and IMDb-linked Cinemeta series episode metadata. Failures of one fallback do not prevent other providers from responding. Missing fields retry; covers and trailers never substitute for episode images.

# 14.6.0

- Planned anime episode totals no longer establish release availability for recent online seasons. Provider corrections replace old assumed counts while preserving watched progress. Ongoing series remain watching even when caught up.
- Continue Watching and its detail dialog label movie parts as films, without fictional season/episode labels. Single-film feedback also labels the film.
- Personal profiles use an account-scoped, version-independent recovery cache and reject stale requests. Settings drafts survive view refreshes.
- “E kam parë të gjithën” marks released parts across the verified franchise, preserving unreleased seasons. Bulk marking is distinguished from spaced episode activity in Wrapped.
- Episode thumbnails can come from exact-media AniList streaming entries. Ambiguous episode numbers, insecure URLs and poster substitutions are rejected. Missing episode details retry sooner, and account changes cannot receive an old account's response.
- Calendar reads confirmed upcoming schedules as well as recent episodes, defaults to Watching, and preserves each source label. Diary adds note/rating filters and date ordering.
- Personal views receive shared cards, vector achievement art, additional achievements, and short animations with reduced-motion support.
- Timestamp spacing is a heuristic, never proof of real viewing. Upstream providers can omit or revise dates, descriptions and images; the UI preserves unavailable states rather than inventing data.

# 14.5.0

- PWA: ikonë maskable e veçantë, screenshots të ndërfaqes dhe shortcuts Biblioteka/Kërko/Aktiviteti që hapen pas identifikimit. Screenshots nuk rëndojnë precache-in e aplikacionit.
- Njoftim pas ruajtjes së episodit me Zhbëj për 12 sekonda; kontroll i llogarisë dhe ngjarjes së fundit para zhbërjes. Dështimi i ruajtjes nuk shfaq sukses.
- Swipe djathtas në kartat e episodeve të telefonit përdor të njëjtin veprim të sigurt dhe ofron zhbërje. Gjeste vertikale, majtas dhe të anuluara injorohen.
- README i shkurtër, udhëzime zhvillimi të veçuara dhe `.env.example` pa sekrete. Node/engines dhe User-Agent nga versioni i paketës mbahen.
- Teste sjelljeje për shënimin/zhbërjen, ruajtjen e dështuar, gjestet, shortcuts dhe asetet e manifestit. Preview-t e Vercel ekzistojnë për branch/PR; shtohet template për shqyrtimin e PR-ve.
- Përgatitet protokolli për 3–5 përdorues realë; prova është ende e pakryer. Kontrollet e përsëritura të rendit të bootstrap-it zëvendësohen me prova të nisjes, hyrjes dhe veprimeve reale. Kontrollet legacy për funksionet e tjera ruhen aty ku ende mungon zëvendësimi.

# 14.4.0

- Temë e çelët/errët/automatike te Cilësimet; preferencë vetëm në pajisje, me theme-color dhe color-scheme të përputhur.
- Tokens të përbashkët për ngjyrat, tipografinë, rrezet, hijet dhe z-index; stack sistemor i deklaruar saktë.
- Përshtatje e paletës legacy gjatë build-it, ruajtje e ngjyrave mbi foto/butonat kryesorë dhe hije më të lehta në temën e çelët.
- Blur i kufizuar në 8px, heqje e deklaratave identike dhe unifikim i familjeve kryesore të breakpoints.
- Teste për preferencat, dështimin e ruajtjes, ndryshimin e sistemit dhe kontrastin në të dy pamjet.

# 14.3.0

- Ngarkim paralel i varësive të pavarura, kontrolluesit dhe IndexedDB; nisje vetëm pasi të jenë gati.
- Ditari dhe CSS-ja e tij ngarkohen sipas nevojës, me riprovim dhe mbrojtje kur navigimi ndryshon gjatë ngarkimit.
- Cache publik i kufizuar me TTL, dedupe, anulim të veçuar dhe backoff për kërkim/metadata AniList, Jikan dhe TVMaze.
- Planifikues pa mbivendosje që ndalon timer-at në skeda të fshehura dhe rikontrollon në kthim.
- HTML NetworkFirst me timeout 3 sekonda dhe fallback precache; dimensione posterësh dhe ngarkim i menjëhershëm në detaje.
- Buxhete për JavaScript, Lighthouse LCP/TBT dhe teste të cache-it, timer-ave e Ditarit lazy.

# 14.2.0

- Migrim i kontrolluar në IndexedDB: snapshot, pending journal dhe revision atomikë; kontroll SHA-256 dhe kopje e mëparshme për rikuperim.
- Kopja aktive write-ahead mbahet; pastrimi heq vetëm backup-e historike identike pas verifikimit. Fshirja e llogarisë heq edhe kopjet IndexedDB dhe pengon rikthimin kur DB është bllokuar.
- Validim pa heqje të heshtur të rreshtave për import/eksport/cloud; payload-i cloud i pavlefshëm nuk mbishkruan kopjen lokale.
- Merge ruan eventId, batch-e me datë të njëjtë dhe lista të pavarura nga dy pajisje. Ruajtja e listave të importuara zgjerohet në 50 pa ndryshuar kufirin e krijimit në UI.
- Prova për korruptim, quota/fallback, skeda konkurruese, izolim llogarish, fshirje, importe të mëdha dhe histori offline.

# 14.1.0

- Ndarje e modelit të bibliotekës, transportit të katalogut dhe lidhjeve të UI nga app.js; importe/eksporte reale dhe startApp eksplicit.
- Store i përbashkët me getState/subscribe, një burim kanonik dhe njoftime vetëm pas ruajtjes së suksesshme.
- Heqje e dy objekteve globale të migrimit dhe e listener-it të dyfishtë të filtrave; delegim i organizuar që trajton edhe SVG brenda butonave.
- JSDoc/checkJs strikt për store dhe event delegation; teste për normalizimin, ndërrimin e llogarisë, rollback dhe pastrimin e listener-ave.

# 14.0.0

- Pesë hyrje kryesore dhe mjete dytësore sipas faqes; etiketa kryesore të unifikuara në shqip.
- Udhëzues me tre hapa për llogaritë e reja, gjendje bosh me kërkim/import dhe fshehje e paneleve pa përmbajtje.
- Progresi dhe episodi i radhës dalin përpara në detaje; përshkrimi, aktorët dhe burimet hapen me palosje.
- Burimet opsionale te Cilësimet → Avancuar; tregues i ruajtjes/offline, skeleton dhe riprovim për kërkimin.
- Teste sjelljeje për hyrjen e parë, navigimin, offline dhe dështimin/riprovimin e kërkimit.

# 13.11.0

- Tipografi e përbashkët, fokus i dukshëm, skip link, tituj të strukturuar dhe SVG në navigimin desktop.
- Butona mobilë 44px, tekst pa zmadhim automatik në iPhone dhe mbështetje për reduced motion/forced colors.
- Semantikë e korrigjuar për kërkimin, filtrat mobilë dhe butonat e kartave; kontrast i përmirësuar.
- Axe WCAG AA dhe screenshot regression për bibliotekën në CI.

# 13.10.0

- Web Push: lease atomik, 5 përpjekje dhe backoff i qëndrueshëm. Status veçmas për pajisjet; sukseset nuk ridërgohen gjatë riprovimit.
- Endpoint-e Windows/Edge, pastrim 404/410, lexime të grupuara sipas përdoruesit.
- VAPID_SUBJECT në env dhe autentikim i plotë në konfigurim.

# Changelog

All notable changes to AnimeTrack are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Current release: `14.8.0` / package version `14.8.0`.

## [Unreleased]

## [13.9.0] - 2026-09-30

### Security
- Snapshot the complete application schema, grants and RLS policies for reproducible restores; add database ownership, revocation and invitation privacy tests.
- Convert serverless proxies to ESM with validated inputs, bounded transport, local throttling and an atomic shared database budget.
- Encrypt AniList/MAL credentials on the authenticated server and remove persistent browser provider-token storage.
- Throttle exact-handle lookups and invitations, make invitation responses uniform and hide declined requests from senders.
- Enforce active account sessions in application RLS and keep provider credentials inaccessible to browser roles.

### Added
- Account data export and permanent account deletion with confirmation and password reauthentication.
- Behavioral API/vault tests, account privacy browser flow, PostgreSQL restore/RLS checks and database lint in CI.

### Limitations
- Initial AniList authorization still uses implicit OAuth, followed by transfer to the server vault; a complete authorization-code flow needs configured provider client credentials.
- Production backup/PITR is not enabled or verified by this release. Schema recreation in CI does not verify a production data backup.

## [13.8.0] - 2026-09-30

### Security
- Bundle the exact npm Supabase SDK locally; remove jsDelivr loading, its runtime cache and the SDK polling loop.
- Route 116 HTML insertions through a shared DOMPurify boundary. Add an auto-escaping tagged template for shared controls and regression tests for XSS, decoded text and nested fragments.
- Freeze the public cloud configuration and remove the technical setup panel and localStorage configuration writer.
- Restrict avatars to this project's Supabase Storage objects with emoji fallback, including existing friends' profiles.
- Enforce same-origin scripts/styles, explicit API connection hosts, no inline handlers/styles, and HSTS includeSubDomains. Replace inline progress/background styles with finite classes and image elements.
- Disclose AniList token storage risks and distinguish explicit provider callbacks from Supabase email verification.
- Add SECURITY.md, weekly Dependabot checks, security lint, Prettier baseline, pinned Node configuration and npm audit in CI.

### Tests
- Browser regression tests use the bundled SDK network boundary; a guest bootstrap test loads the real SDK under production CSP.
- Remove release-number equality assertions unrelated to behavior.

## [13.7.0] - 2026-09-29

### Fixed
- Every library save, account open, cloud pull, Realtime payload and conflict recovery checks for verified duplicate anime records.
- AniList/MAL identities and absorbed library/TVMaze IDs survive compact cloud payloads, preventing old devices from recreating a second card.
- Canonical duplicates are reconciled before TVMaze matching, avoiding ambiguous matches to two copies of the same franchise.
- Demon Slayer's four TVMaze seasons map into the five canonical TV arcs without shifting progress into films; bulk undo, episode notes, ratings, rewatch references and custom lists survive the merge.
- Series updates roll back on persistence failure. Live-action movies cannot enter the anime franchise hydrator.
- Full timelines retain up to 200 parts instead of truncating franchises to 45 parts.

### Design
- Refined library cards, search, metrics and controls with quieter surfaces and clearer typography on desktop and mobile.
- One readable release timeline replaces duplicate horizontal season selectors. TV seasons and films have distinct labels, progress bars and All / Seasons / Films filters.
- Timeline controls have selected states, touch-friendly sizes and reduced-motion support.

## [13.6.0] - 2026-09-29

_Public release label: **13.6.0**._

### Security
- Audited and hardened RLS/grants for profiles, friendships, push reminders and push subscriptions; anonymous table access is explicitly revoked.
- SECURITY DEFINER friend lookup/request helpers keep an empty immutable search path, verify auth.uid(), and deny anonymous execution.
- External movie, MAL/Jikan, TVMaze, recommendation and rich-details metadata is sanitized through DOMPurify before it reaches UI renderers.
- Security-header regression coverage verifies clickjacking and MIME-sniffing protections.

### Stability
- Vite now generates the service worker precache from hashed production assets with vite-plugin-pwa/Workbox while preserving Web Push.
- Cross-device conflicts compare Supabase updated_at with the durable local journal timestamp and merge watched progress/history before conditional writes.
- Supabase Realtime channels are unsubscribed and removed on account switches and page lifecycle cleanup.
- dist/ remains ignored from source control.

### Architecture
- Unit tests run under Vitest as ESM .js tests.
- CSS imports are consolidated into ordered bundles with shared design tokens.

## [13.5.2] - 2026-09-29

_Public release label: **13.5.2**._

### Fixed
- TVMaze seasons can no longer lose visible remaining episodes when incomplete or foreign airing metadata appears. Known historical season totals remain available instead of being demoted to “Në pritje”.
- TVMaze entries are never passed through the MAL/Jikan franchise hydrator using a TVMaze source ID.
- Episode release metadata from AniList/Jikan is ignored for TVMaze seasons; TVMaze episode dates remain the authority.

### Performance
- Lazy posters decode asynchronously and use low fetch priority to reduce main-thread image work.
- Offscreen library/home/TV cards use content-visibility/containment where supported.
- Mobile episode tabs no longer use a live backdrop blur while scrolling.

## [13.5.1] - 2026-09-29

_Public release label: **13.5.1**._

### Fixed
- Continue Watching now uses canonical TV-season numbering, so movie/special/OVA timeline parts do not shift the displayed season.
- Mobile cloud sync re-subscribes to the per-user Realtime channel and performs an authoritative cloud re-fetch whenever the app returns to the foreground.
- Realtime channel errors/timeouts/closures are surfaced to the account sync state instead of leaving a stale mobile library silently connected.
- The PWA checks for an updated service worker immediately after registration to reduce stale installed iPhone builds.

## [13.5.0] - 2026-09-29

_Public release label: **13.5**._

### Added
- AniList/MyAnimeList Live Sync page with provider connection state, comparison table and manual conflict resolution.
- Device-local provider baselines for safe direction detection: pull, push, conflict, remote-only and local-only.
- AniList authenticated list reads and SaveMediaListEntry mutations for progress, status and score.
- MyAnimeList same-origin Vercel proxy for authenticated profile/list/update requests without storing user tokens server-side.
- Read-only MAL username mode through Jikan and read-only AniList username mode without OAuth.
- Optional AniList implicit OAuth connection when a user supplies their own AniList Client ID.
- Auto Live Sync toggle and mobile Profile shortcut.

### Changed
- External imports can retain provider cover/year/genre/source metadata when remote-only entries are added by Live Sync.
- Auto-sync only applies matched one-sided changes; it never auto-imports remote-only titles and never resolves two-sided conflicts.

### Security
- AniList and MAL access tokens remain device-local and are excluded from Supabase/cloud payloads.


## [13.4.0] - 2026-09-29

_Public release label: **13.4**._

### Added
- Rich Details section on title pages with cast, director/staff, studio/production, genres/tags and trailer links when available.
- Clickable person profiles inside AnimeTrack for AniList staff/voice actors, TVMaze cast/crew and TMDB movie credits.
- Person filmography / combined credits with up to 30 related works and direct navigation back into AnimeTrack.
- Library awareness inside filmography so already-saved works open directly instead of creating duplicates.
- 24-hour local cache for rich title/person metadata.

### Changed
- TMDB TV works from a movie person's combined credits route through universal search so AnimeTrack resolves the canonical TVMaze representation.
- Movie details keep basic cast/director text even without a TMDB token; linking TMDB upgrades those names to structured clickable profiles.


## [13.3.0] - 2026-09-29

_Public release label: **13.3**._

### Added
- Where to Watch section on title detail pages.
- Official anime streaming links from AniList with MyAnimeList/Jikan fallback.
- TMDB watch-provider availability for movies and live-action TV by selected region, with JustWatch attribution.
- Provider categories for subscription, free, ad-supported, rent and buy.
- Synced region preference and a dedicated Where to Watch library page.
- Local 12-hour availability cache to reduce repeated provider requests.

### Changed
- TMDB settings now also power Where to Watch for movies and TV.
- TVMaze titles can resolve to TMDB through IMDb IDs before falling back to title/year matching.


## [13.2.0] - 2026-09-29

_Public release label: **13.2**._

### Added
- Personal Diary generated from dated episode, movie and rewatch activity.
- Diary entry editing for date/time, private per-watch rating and private note.
- Filters by media type, first watch/rewatch, month and text search.
- Diary summary metrics and a 30-day activity heatmap.
- Fifth mobile navigation tab for Diary.

### Changed
- New watch-history records now receive stable event IDs so Diary edits remain addressable across cloud sync.
- Anime rewatch episode records preserve Diary note/rating metadata.
- Diary date edits feed the existing Statistics and Wrapped calculations instead of maintaining a second activity database.


## [13.1.1] - 2026-09-28

_Public release label: **13.1.a**._

### Fixed
- Global search now collapses AniList/MAL and TVMaze representations of the same anime into one canonical result using provider-agnostic identity evidence (aliases, release date/year, format, genres and episode totals).
- Cross-provider matching now handles provider season splits when cumulative episode totals match (for example Zenki: TVMaze 25+26 vs AniList 51).
- Existing TVMaze duplicate cards can be repaired into the canonical AniList/MAL card without losing watched progress.


### Changed
- Migrated the frontend build to Vite 8 with content-hashed production assets.
- Moved editable application code into `src/` and generated production output into `dist/`.
- Standardized browser E2E coverage on Playwright Test and removed the Python browser smoke script.
- Consolidated legacy GitHub release-application workflows into the main CI workflow plus the icon workflow.
- Removed obsolete Base64 `.release/` patch payloads from the active repository; Git history remains the archive.
- Consolidated all historical `RELEASE_*.md` files into this changelog.

## [13.1.0]

### Added
- Çdo sezon mund të ndahet manualisht në story arcs me emër dhe interval episodesh.

### Changed
- Sezonet, filmat, OVA-t dhe specialet shfaqen në një timeline horizontal në rend publikimi.
- Çdo pjesë ka progresin, datën, score-in e komunitetit dhe rating-un personal në të njëjtën kartë.
- Përmbledhja llogarit mesataren e pjesëve të vlerësuara dhe nxjerr pjesën më të vlerësuar.
- Çdo arc ka rating personal 0.5–10.

## [13.0.0]

### Changed
- Cloud sync tani përdor payload compact dhe Supabase mbetet kopja kanonike për llogarinë.
- Payload-i aktual i bibliotekës së testuar bie nga rreth 3.07 MB në rreth 0.5 MB, duke hyrë nën kufirin 1 MB të Postgres Changes.
- Save queue kalon nga 1100 ms në 120 ms.
- Kur Realtime përmban payload-in e plotë, PC/iPhone e aplikojnë direkt pa një pull REST të dytë.
- Rich metadata lokale ruhet gjatë sync; state-i personal nga cloud është autoritativ.

## [12.15.3]

### Added
- Added Supabase Realtime subscription for the signed-in user's anime_libraries row.
- Added focus, pageshow and visibility-return refreshes plus a 30-second foreground safety poll.

### Changed
- Changes saved on PC trigger a quiet cloud pull on an already-open mobile session, and vice versa.

## [12.15.2]

### Added
- Movie cards can now show poster, year, description and IMDb rating without a user API key when Cinemeta has them.
- Added regression coverage for Avengers: Endgame and Obsession.

### Changed
- Cinemeta is now the primary zero-key movie source, using IMDb IDs and rich poster/metadata payloads.

## [12.15.1]

### Added
- Added Wikidata/MediaWiki as a zero-key fallback for live-action movie discovery.

### Changed
- Movie search now works on a fresh device with no TMDB or OMDb credential.
- Exact movie titles such as Avengers: Endgame can be found and saved without user setup.

## [12.15.0]

### Added
- Added live-action Movies as a third first-class media category beside Anime and TV.
- Movies support Plan to Watch, Watched, rewatch count, personal rating, favorites, notes, IMDb/TMDB ratings, runtime, director, cast, release date and poster/backdrop.
- Added a Movies media filter and movie-specific cards/details.

## [12.14.0]

### Changed
- Opening a title now centers the horizontal season row on the resume season and marks it with “KU E LE”.
- Resume ignores hidden parts and still opens the page containing the next/last watched episode.
- Any season/movie/OVA/special can be hidden from the personal timeline without deleting progress. Hidden parts can be restored from “Pjesë të fshehura”.

## [12.13.0]

### Added
- Global TV season numbering continues across a franchise in release order. Example: Dexter S1–S8, New Blood S9, Original Sin S10, Resurrection S11+ as new seasons arrive.

### Changed
- MAL/Jikan is metadata fallback only; MAL entries are resolved back to AniList IDs when possible before franchise building.
- TV franchise membership uses Wikidata (media-franchise / part-of / follows relations). TVMaze supplies regular seasons and episode metadata.

## [12.12.4]

### Added
- AniList/MAL remains the canonical franchise timeline; TVMaze never adds duplicate seasons when a canonical anime timeline exists.

### Changed
- Cross-provider deduplication now detects the same anime stored once from TVMaze and once from AniList/MAL.
- TVMaze watched progress is mapped by cumulative episode boundaries into the AniList TV parts. This handles different provider season splits, including Demon Slayer TVMaze season 2 (18 episodes) mapping across Mugen Train Arc (7) + Entertainment District Arc (11).

## [12.12.3]

### Changed
- The 12.12.3 service worker auto-activates once to escape the 12.12.2 quota/update deadlock on iPhone. Future releases can return to approval-based activation.

### Fixed
- Browser localStorage now keeps a compact recovery snapshot instead of duplicating the full episode metadata payload. Watched progress, history, statuses, favorites, personal ratings, notes, rewatch data, season identity and airing data remain in the recovery copy.
- Pending compact progress is merged onto the rich server copy before retrying a cloud upload, so local recovery never erases the richer server metadata.

## [12.12.2]

### Changed
- Reload remains blocked while a cloud write is actively in flight or when the local mirror could not be written because storage is full.
- After reload, the existing durable journal is restored and the cloud upload retries normally; pending progress is not discarded.
- The update warning now describes the actual unsafe conditions instead of treating every pending cloud change as data loss.

## [12.12.1]

### Changed
- Franchise traversal now follows AniList relations that represent the same release family: PREQUEL, SEQUEL, ALTERNATIVE, SUMMARY, COMPILATION, CONTAINS and PARENT. Spin-offs and side stories remain excluded.
- AniList/Jikan title aliases are stored per timeline part so English and romaji names such as Demon Slayer / Kimetsu no Yaiba can resolve to one library card.
- Reconciliation now also closes over shared AniList/MAL identifiers, preserving watched episodes and history when old duplicate cards are merged.

## [12.12.0]

### Added
- Separately-added linked entries are reconciled into one library card while watched progress/history is preserved.

### Changed
- Anime franchise timeline now follows official AniList PREQUEL/SEQUEL relations across TV, ONA, OVA, movies and specials.
- Parts are sorted by first release date and labelled independently: Season 1, Film, Season 2, etc.

## [12.11.0]

### Fixed
- Manual library edits, imports, deletions, ratings, favorites, season changes, bulk episode marking, notes and catalog additions now stop before success feedback when persistence fails. The in-memory library is rolled back so a later save cannot accidentally commit a rejected operation.
- Activity is no longer silently truncated to the last 2,000 records when recording, loading, importing or normalizing cloud data.
- The browser and offline shell load one generated stylesheet instead of 33; source files remain editable and tests reject stale bundles.

## [12.10.2]

### Fixed
- Corrects the desktop Home search input race when background refresh rebuilds cards while the user types.
- Preserves the release 12.10.1 genre filters, Wrapped/achievements, filler metadata and cloud journal.

## [12.10.1]

### Changed
- Katalogu sezonal përdor zhanret dhe tag-et reale të AniList (p.sh. Drama, Thriller, Isekai) me filtër kërkimi dhe kontrolle për formatin.
- Wrapped është rindërtuar me statistikë të episodeve të regjistruara në historik, periudha, anime kundrejt serialeve TV, imazh ndarjeje dhe arritje.
- Episode filler dhe recap dallohen vizualisht nga episodet e zakonshme.

## [12.2.0]

### Changed
- No user account, anime library, episode progress, or social record deleted.
- Remaining manual dashboard item: enable Supabase leaked-password protection. SMTP delivery still requires live mailbox delivery testing.

### Security
- Supabase migration 20260927121525 applied: removed TRUNCATE/DDL client privileges; constrained comment/report inserts; blocked client writes to push dispatcher status; added two missing FK indexes.

## [12.1.1]

### Fixed
- Smaller responsive login and registration dialog, one primary action, hidden recovery panel fixed, account statistics removed from signed-out view.
- Confirmation remains enabled; SMTP configuration and a real delivery test remain required.

## [12.1]

### Changed
- Unified Pro Experience visual system: collections, notifications, recommendations, calendar, Wrapped, profile, friends and moderation.
- Mobile library: summary first, quieter filters, consistent two-column posters, readable progress, larger touch targets and safe-area spacing.
- No user data migration. Updated offline shell.

## [12.0]

### Added
- Dexter, New Blood, Original Sin and Resurrection merge into one library title with separate labeled seasons and source IDs.
- Unified search opens and adds TVMaze shows to the shared library.
- New service worker cache version 12.0.0.

## [11.8.0]

### Added
- TV shows persist in the existing account-scoped JSON cloud payload as `tvShows`; old anime data and history remain untouched.

### Changed
- Independent live-action TV library under **Seriale TV**, with a fifth iPhone navigation destination and desktop navigation entry.
- TVMaze-powered title search, show details, seasons and episodes.

## [11.7.0]

### Changed
- Upcoming future-only timeline with 7/30-day filter and local time, purple non-watched indicators.
- Four mobile tabs: Episodes, Search, Library, Profile. Desktop calendar remains.
- Explore shows personal recommendations and AniList popularity-based titles.

## [11.6.3]

### Changed
- Confirms password twice and enforces strength; does not bypass email verification.
- Production email redirect remains canonical.

### Fixed
- Adds authenticated password update after Supabase recovery redirect.

## [11.6.2]

### Changed
- Supabase dashboard must allow https://animetrack-flax.vercel.app/ and set it as Site URL.
- Email-confirmed users should sign in, not register again.

### Fixed
- Canonical production redirect for sign-up, resend, and password recovery; preview hostnames no longer become production email callback targets.

## [11.6.1]

### Added
- New mobile-only profile: personal cover, round avatar, real episode/movie/time counts, friends, horizontal poster shelves.

### Changed
- Production email delivery to non-team addresses requires a custom SMTP provider in Supabase.
- PWA cache updated; responsive safe areas and auth form scrolling improved.

## [11.6]

### Added
- Authenticated new users get a private profile with an exact-searchable username.

### Changed
- Signup and login are clearly separated, including name, strong password and confirmation, email verification and resend with cooldown.
- Social activity is opt-in and restricted to friends on private profiles.

## [11.5]

### Changed
- Your Anime Day on PC; collapsible daily shortcut on iPhone so TO WATCH stays near the top.
- Continue-watching uses the shared personal library, next released episode and guarded Undo.
- Ongoing airing series stay in Watching when caught up and resurface when an episode becomes available.

## [11.4.1]

### Changed
- Compact 44–48px episode controls: unwatched neutral violet; watched history green only.
- Upcoming timeline uses future, deduplicated personal airing events and includes a calendar shortcut.
- iPhone standalone status-bar masking and safe-area-aware sticky mobile tabs.

## [11.4]

### Changed
- iPhone episode feed with To Watch / Upcoming tabs and list/grid toggle, styled in AnimeTrack's original violet palette.
- Compact poster-left cards, large one-tap watched control and automatic next released episode.
- Watch History with collapsed 2-item preview and optional full history.

## [11.3]

### Added
- Library: new searchable summary, status counts, two-column mobile cards, compact filters and sort.

### Changed
- Episode Hub: stable fullscreen mobile dialog, compact media beside title, safe-area-aware header, touch targets and retained scroll position.
- Calendar: mobile-first timeline by default, 14-day scrollable date selector, readable event cards and compact month/week.
- Account: sign-in separated from new-registration confirmation, password visibility and stronger client-side validation.
