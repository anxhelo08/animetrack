# Release validation — 2026-10-18

- Required typecheck, ESLint, format check, `npm test` and production build passed. Vitest: 95 files, 652 tests.
- Backend behavior covers bearer/session enforcement, cross-account denial, owner/editor permissions, stale revisions, sanitized list items, hashed calendar capabilities and revocation.
- Import behavior covers independent ratings, explicit mapping, history deduplication, notes preservation and watchlist status preservation. IndexedDB tests verify that Trakt backups survive reload and remain append-only.
- Chromium desktop/phone checks passed for saved views, calendar link creation/revocation, JSON preview/apply, repeated import and save-failure rollback. Mobile regressions cover next-episode home and oldest-to-newest history. Existing calendar checks and desktop reading navigation/card retention passed. Reading tests intentionally skip phones; WebKit is unavailable in this workspace.
- The existing watch-repair test referenced an obsolete `Reviews` tab. Its locator now uses the actual Albanian `Shënimet` label; the behavior passes on both devices.
- Startup gzip remains below the unchanged 310,000-byte budget. The total optional-feature allowance increases from 348,000 to 357,000 bytes for the deferred connected tools; measured total is approximately 355.4 KB.
- Supabase migration applied and Edge Function `anime-connected` deployed ACTIVE. New tables have RLS enabled and no anon/authenticated table access. Direct live HTTP probes of the Supabase host are blocked by this environment's network policy; no authenticated real-user write was performed for testing.
- Trakt application registration is absent, as confirmed by the user. JSON import works independently; direct API configuration, private-profile OAuth and two-way sync are not claimed as delivered.
