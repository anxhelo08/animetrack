# Changelog

All notable changes to AnimeTrack are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The public label `13.1.a` maps to package version `13.1.1`.

## [Unreleased]

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
