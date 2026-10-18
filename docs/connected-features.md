# Connected library features

Saved views and smart lists use `anime_feature_records`; collaborative lists use `anime_shared_lists` and `anime_list_members`. These records do not change the private library payload. Only the Edge Function service role can access these tables. Its POST actions authenticate the caller, require an active session and enforce ownership/editor membership. Editors receive public title identifiers, never library notes, ratings or history. List item changes require the current revision; conflicts return 409. Refresh retrieves collaborators' changes.

Calendar subscriptions use a random, revocable capability link. Only its SHA-256 hash is stored. Anyone holding the link can read scheduled titles, so users should revoke a leaked link. The feed reads the latest cloud library, includes up to 90 days of known future releases, and excludes private history/notes. Calendar apps choose their refresh interval. No account JWT is included in a feed URL. GET capability authentication and POST bearer authentication are implemented inside `anime-connected`; deployment uses `verify_jwt=false` to permit calendar clients.

Trakt JSON imports accept history, ratings and watchlist arrays, up to 3,000 rows and 4 MB. Match existing titles by identifiers or explicitly select a title and season; unmatched rows are skipped. No title-name guessing or automatic franchise creation occurs. Preview changes before applying. The app creates a local IndexedDB backup, verifies that the account/library has not changed, and saves once. Repeated history entries are deduplicated. Existing ratings and notes are preserved. A watchlist creates a private manual list without changing personal status.

The user has not registered a Trakt application. Direct public-profile API import remains hidden until `TRAKT_CLIENT_ID` is configured as a Supabase Edge Function secret. Private profiles use JSON; OAuth and two-way sync are not implemented. Never place credentials in frontend configuration.

Regional availability reuses the existing TMDB/JustWatch panel and region selector. It needs the user's configured TMDB token. Results display their source and freshness; generic anime links remain explicitly unverified. No new CSP hosts were added.

Migration: `20261018141055_connected_library_features.sql`. RLS without client policies is intentional deny-all; access is server-authorized. No existing library rows are migrated or overwritten.
