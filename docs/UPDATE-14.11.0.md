# AnimeTrack 14.11.0

## Available flows

- Desktop Manga/Manhwa discovery sends genre inclusion/exclusion, publication year/status, minimum score and known chapter limits to AniList. Jikan is the fallback; unsupported length/status filters are applied to its returned metadata. Pagination can return fewer matching items on the fallback.
- Reading recommendations rank provider results using genres from favorite, highly rated or started reading titles. The explanation names a matching reading title; owned provider identities are excluded.
- Reading collections share the same cloud preferences with a separate scope. Watch collections continue to include anime, television and films.
- Sharing is an explicit public **snapshot URL**, containing only list name, title names, types and years in the URL fragment. It opens a read-only dialog for signed-out visitors. It does not publish personal notes, diary, ratings or progress. A snapshot is immutable; possession of the link allows opening it, and it cannot be revoked by deleting the original local list.
- Reading details and desktop watch details offer overview, chapters/episodes, personal notes and related-title tabs. The title and resume action stay visible. Default overview retains the existing information; tabs let users focus on one task.
- Chapter source and last check are visible, unknown totals stay unknown, and an anime relationship never invents the chapter where its adaptation ends.
- Manga sync uses connected AniList/MAL credentials held by the existing server vault. Users preview entries and explicitly choose pull/push. Conflicts require confirmation. Local diary and notes are preserved. Known AniList/MAL IDs prevent duplicate imports across providers; mappings are never inferred from a similar title.
- Chapter inbox entries derive from actual catalog releases/discovery dates. Server checks are opt-in for cloud users; push additionally requires a device subscription. The existing cron dispatcher checks two leased reading titles per invocation, using the same public metadata lookup as the client. Results stay in an owner-only metadata table, leaving the user's library untouched. The client merges metadata on account load, active reading checks and its existing five-minute visible refresh. Unread state and current opt-in are checked again before sending. A first unknown total establishes a baseline instead of fabricating premieres. Rate limits and unavailable providers can delay a check.
- Where-to-watch distinguishes reported regional availability from official links whose region is unconfirmed. Unverified first search matches are no longer used as the identity of a movie or series.
- Reading goals count final read actions during the current week, exclude future dates and avoid repeated-toggle inflation. Genre totals explicitly overlap for multi-genre titles. No reading time is fabricated.
- Ctrl+K in reading searches only reading rows and the Manga/Manhwa catalog. The five phone destinations remain intact.

## Player integration

The downloadable Chrome/Edge extension in `public/integrations/animetrack-player.zip` is built from `integrations/player-extension`. It supports top-level HTML video in Crunchyroll, Netflix, Disney+ and Prime Video, requires manual exact video-to-episode mapping, and sends progress to an open AnimeTrack tab. Played seconds exclude seeking; after 90%, only the configured episode is marked. Already watched episodes are not toggled. The user enables the feature and installs the extension; account tokens are never provided to it. Cross-origin video iframes and player implementations that hide the HTML video element are unsupported. This is the implemented automatic tracking integration; SIMKL OAuth is not configured or claimed as active.

## Validation

Unit checks cover filtering, recommendations, weekly counts, share privacy/Unicode/types, sync conflicts/preservation/owner changes, provider MANGA endpoints, chapter push opt-in and metadata leases. Browser checks cover reading persistence, search cancellation, chapter tools, NEW expiry, density/collections/goals, scoped keyboard, note preservation, signed-out snapshots, player events and watch detail tabs. Existing desktop/mobile library tests also run. Layouts were inspected at 1024/1440 and dark/light; accessibility audit passes for reading.

The reading SQL migration was exercised against embedded PostgreSQL: SQL parsing/execution, leases, duplicate finish rejection, no personal-library overwrite, owner access, revoked-session access and restricted writes passed. The same regression is included in `scripts/test-database.mjs` for the disposable PostgreSQL suite.

Live calls to public AniList from this workspace hit Cloudflare/network restrictions. Direct Supabase function HTTP probes were blocked by the workspace proxy; deployment status and database permissions were verified through the connected tools. Provider payload handling is verified with deterministic test responses; real user provider credentials and end-device push/browser-extension installation are not exercised here. The planned usability study with 3–5 people requires actual participants and is not claimed as completed.

Supabase CLI migration creation was attempted twice but startup could not write to the environment's read-only home directory. The migration source was saved directly and tested; production DDL is applied through the connected Supabase migration tool.
