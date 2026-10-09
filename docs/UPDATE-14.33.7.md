# AnimeTrack 14.33.7 — Calendar follows the whole library

Adding an anime now starts an airing check immediately after the library save succeeds. Stored, confirmed dates appear before provider requests finish. Newly created titles receive priority, and a title added during an existing refresh triggers a subsequent check rather than being omitted from the snapshot.

The calendar opens with “Biblioteka” selected, including planned, paused and dropped titles as well as watching and completed titles. Other filters remain available. No change is made to the main library's exclusion of Plan to Watch entries.

The existing five-minute server worker now discovers public schedule identities from all undeleted library titles. Individual identities still refresh once per 24 hours, with the existing retry and lease controls. No personal title, note, watched flag or library payload is copied into the public metadata cache. No cron, API host, cache shape or library schema changes.

The visible-tab scheduler also checks schedule freshness independently of catalog freshness. A delayed metadata cache cannot block provider fallback indefinitely. Dates remain provider-confirmed; missing or unavailable schedules are shown explicitly rather than fabricated.

Calendar presentation adds clear date columns in the agenda, compact release artwork, month weekday headings, readable mobile controls and refresh feedback. Period changes and button feedback use bounded animations; reduced motion removes spatial effects. Existing search, reminders, .ics export, source coverage and episode actions remain.

Database behavior was verified in a disposable PostgreSQL 17.6 database, including all statuses, deleted-title exclusion, lease/freshness rules, personal-data preservation and restricted browser privileges. The migration was applied to the configured Supabase project; the cache retains RLS, the claim function retains SECURITY INVOKER, and only the worker can claim jobs.

Validation: typecheck, lint, format check, 636 unit tests across 92 files and production build passed. Ten calendar browser scenarios passed across desktop and iPhone Chromium, including automatic addition, all-status filtering, offline dates, WCAG AA checks and reduced motion. Existing episode-update and future-title browser scenarios also passed. JavaScript remains within the existing performance budgets (307,979-byte startup gzip; 346,863-byte total gzip).

Deployment: the daily metadata migration is active on Supabase. Frontend publication to the public repository and Vercel is pending.
