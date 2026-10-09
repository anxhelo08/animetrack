# Update 14.33.5 — News and viewing sources

Crunchyroll News RSS is now the primary news feed, with Anime News Network as a fallback. The news page links to Crunchyroll directly.

Anime episodes offer Way2Movies alongside Anisuge; movies and TV offer Atlantic alongside CineHD. Provider searches use explicitly labelled Google site searches because a documented provider search API was not verified. A search result is not treated as confirmed episode availability.

After a user associates an anime episode with a Way2Movies URL matching `/watch/tv/<id>/<season>/<episode>`, the other episodes of that local season derive their URLs from the stored link and existing episode offset. The opaque title identifier, remote season and server query are preserved. Unsupported URL patterns remain scoped to the exact episode. No title identifiers are guessed. Existing Anisuge and CineHD links remain compatible.

The existing library schema, progress and watch history are unchanged. No new CSP script/connect hosts or inline style attributes are introduced. Icons are local assets and outbound links use noopener/noreferrer.

The additional source controls receive a deliberate 1 KB allowance in the total compressed JavaScript budget (347,000 bytes). The startup budget remains 310,000 bytes. Measured startup JavaScript is 307,680 bytes gzip and total JavaScript is 346,564 bytes gzip.

All five required checks passed: typecheck, lint, format:check, npm test (631 tests in 91 files), and build. The compressed JavaScript budget check passed. All 24 browser scenarios passed on desktop Chromium and the iPhone Chromium viewport (22 in the initial run; two existing icon assertions passed after being scoped to the primary provider). Verification covers source search queries, safe URL validation, season mapping and offsets, serialization/reload, primary/fallback RSS behavior and browser episode interactions on desktop and iPhone viewport.

Publication is pending explicit approval after automatic approval review rejected uploading the complete updated app.js to the public repository. This release includes the locally committed 14.33.4 fixes when publication is approved.
