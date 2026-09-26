# AnimeTrack 11.3 — Mobile Experience

Source baseline: 11.2 Pro. Changes in this package affect presentation and account input validation. Existing anime progress and private libraries are not reset.

- Episode Hub: stable fullscreen mobile dialog, compact media beside title, safe-area-aware header, touch targets, sticky episode/discussion tabs, retained scroll position.
- Design: restore the amethyst/cyan visual identity and remove the dominant yellow actions across phone/desktop.
- Calendar: mobile-first timeline by default, 14-day scrollable date selector, readable event cards, compact month/week.
- Library: new searchable summary, status counts, two-column mobile cards, compact filters and sort; mobile private lists layout.
- Account: sign-in separate from new-registration confirmation, password visibility, stronger client-side signup validation, normalized emails.
- Friends: retain exact-username private invites and degrade gracefully if an optional search source fails.
- Security: migration secures friendship identity fields and prevents duplicate active relationships; no existing user rows modified.

## Checks

`npm test` (38 smoke tests). JS syntax checks. A headless browser was attempted in this environment but navigation was blocked by browser administration rules; the iPhone-specific visual checks remain to be performed on a real device or a permitted browser.

## Deploy

Push these source files to `anxhelo08/animetrack` main to trigger Vercel. The database migration `20260926165000_friendship_update_guard_113.sql` has already been applied to the connected Supabase project. Do not re-create accounts or clear the libraries.
