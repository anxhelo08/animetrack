# AnimeTrack 14.27.0

Reading now has a quieter, responsive workspace with status shortcuts, a next-chapter resume card and prominent WeebCentral actions. Anime and TV libraries have unread/new episode filters, visible mobile titles and a detail summary with progress, the next episode and validated catalog links. Both detail views can copy a title.

Personal-library search recognizes alternate names, accents, punctuation and season names. Changing filters no longer duplicates retained cards. Desktop search no longer takes its value from the hidden mobile field.

## Source handoff

- A valid stored WeebCentral series ID opens that series. Otherwise the action explicitly offers a title search.
- The assumed reading experience is an external tab, rather than an embedded reader. Opening a source never changes reading progress.
- Destinations use fixed provider hosts and validated IDs. The existing HTML sanitizer and CSP remain intact; no new script or connection hosts were added.
- References inspected: [WeebCentral](https://weebcentral.com/), its [search controls](https://weebcentral.com/search) and [recent updates](https://weebcentral.com/hot-updates), and [TVmaze](https://www.tvmaze.com/). Network restrictions prevented a live title-query check. Provider navigation is verified with an intercepted browser popup, not a claim about live reader content or catalog completeness.

## Validation

- Typecheck, lint, format check, unit tests and production build passed; 565 unit tests in 79 files.
- Desktop and iPhone-sized Chromium cover source navigation, unchanged reading progress, alias search, filters, title copy, responsive cards, episode artwork, IndexedDB recovery, quota recovery, sync and CSP. No physical iPhone/Safari verification is claimed.
- All 34 applicable browser scenarios passed across the broad run and isolated reruns; 14 scenarios were intentionally skipped. The repeated broad run itself returned nonzero because of the infrastructure failures described below, rather than being reported as a clean full-suite run.
- A responsive-card assertion now waits for resize rendering before measuring; its original broad-run failure and focused passing retry are recorded in the test logs.
- A repeat browser run overlapped the required production rebuild, briefly removing preview assets. Two fixtures failed with a startup load error and HTTP 404; both passed a rerun after the build, without changing application behavior. A concurrent runner also removed a trace artifact during teardown; that scenario passed separately with its own output directory.
- Existing tests scoped to other layouts or configured sync scenarios are skipped intentionally.
- Browser fixture covers are illustrative, not production library screenshots. The optional agent-browser CLI could open the page but its subsequent Chromium launch failed in this sandbox; Playwright provided the browser verification.
- JavaScript gzip: 339,292 bytes across 19 chunks. The budget increases by 1,000 bytes to 340,000 for these controls. No dependency, database or stored-library schema changes.

The previous iPhone recovery protection remains in place. This update does not clear local storage, remove backups or alter episode/chapter history.
