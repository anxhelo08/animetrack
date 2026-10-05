# AnimeTrack 14.26.0 — Phase 1

The existing Vite/vanilla application now preserves deletions and episode unmarks across whole-row cloud conflicts, renders library cards progressively, and exposes persistent mobile sync status.

## Sync correctness

- `deleted` tracks anime IDs and `unwatched` tracks episode numbers per season. Per-episode `watchedAt` distinguishes a fresh rewatch from a stale watched array or an unrelated newer edit. Equal timestamps favor removal; an explicitly newer watch/addition survives. Removal tombstones expire after 60 days.
- A backward-compatible `syncSchema` migration first saves the original owner payload under `_before_sync_1426`. It aborts on backup failure. Legacy date-only/missing dates produce valid, conservative episode stamps. Imports retain previous removal records; failed persistence restores the original state.
- Supabase migration `20261005153419_library_sync_server_ordering.sql` leaves the baseline unchanged, assigns library `updated_at` on INSERT and UPDATE using `clock_timestamp()`, preserves publication membership, and adds an authenticated, invoker-only clock RPC.
- The client stores the server offset per owner, advances calibrated time with a monotonic timer, and uses it for anime, chapter and collection merge timestamps. Row revisions remain opaque CAS tokens; journal phone time no longer determines conflict winners.
- A divergent revision triggers merge and conditional retry, up to four attempts. Local changes made while a request is pending remain dirty. Persistent contention remains visible for retry instead of authorizing a blind overwrite.

## Mobile list and dialogs

The library renders 30 keyed cards first. IntersectionObserver appends batches of 30; a visible button also supports explicit loading. Filters/search apply before pagination, including media kind. A changed card is patched from sanitized ATHTML output, preserving card roots and unchanged posters. Library/home/upcoming requests share one animation-frame pass. Sync and library/account deletion confirmations use a non-blocking native dialog. The mobile status shows saving, conflict, offline and synced with the last server time.

## Measurements

Chromium iPhone 15 layout, 500 titles, local Vite preview, CPU throttled 4×. Measured from the library click to the first nonempty grid and an animation frame, including startup work that overlaps the interval. Observer delivery includes the following 200 ms. These are individual local fixture runs, not physical-device or upstream-network benchmarks.

| Metric | Before | After |
| --- | ---: | ---: |
| First library render | 2636 ms | 1024 ms |
| Initially materialized cards | 500 | 30 |
| Long tasks observed | 3 | 6 |
| Total observed long-task duration | 2136 ms | 746 ms |
| Largest observed long task | 1966 ms | 257 ms |

The smaller batches produce more, shorter tasks. First-render time decreased about 61%; the largest long task decreased about 87%. Raw observations are in `PHASE1-PERFORMANCE-14.26.0.json`. The browser test subsequently materializes all 500 cards and checks that pressing +1 preserves every card root, including the changed one.

## Verification and limits

- Mobile acceptance covers two isolated browser contexts sharing a fake CAS server: phone offline ep 4 + PC ep 5, reconnect union without a conflict dialog, deletion, unmark, reload, and the same sequence with +10-minute phone time. Backup, cancellation, newer rewatch/addition, old formats and persistence rollback have behavior tests.
- The unchanged CSP hash and served policy are asserted; an inline script is blocked, and generated library/dialog/status controls have no inline style attributes.
- PC/phone regression run: 52 passed, 14 skipped because the tests target the other layout. Covers reading, episode photos, IndexedDB, PWA offline/update behavior, navigation, Diary and progress.
- The migration was tested in a rollback transaction, applied to the configured Supabase project, and verified again with temporary fixtures: INSERT/UPDATE ignore supplied clock values; clock permissions and Realtime membership pass. Production user rows were not used as fixtures.
- Final validation on the release code: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (77 files, 556 tests), and `npm run build` all exited 0. `npm run test:performance` also exited 0. The owner-switch clock recalibration has a dedicated regression test.
- `npm run test:db` cannot run here: no disposable local `DATABASE_URL` is configured. Its SQL verification for this change ran separately through Supabase. Physical iOS/Android devices, WebKit and live two-device Supabase websocket delivery were not tested; browser convergence uses deterministic Realtime/CAS fixtures.

Assumptions: newer means the corrected per-field event timestamp; equal times favor removal. This branch's real cloud handlers are the implementation target, even though some handler names in the supplied context are absent. Existing owner IDs remain the identity keys.

Risks: offsets have network-latency uncertainty, and first-use offline edits cannot have a trusted server clock until calibration. Offline copies older than the 60-day tombstone horizon require care. Updated clients are needed to generate per-episode rewatch stamps. The server still stores a whole-library JSON row, so very large libraries and repeated concurrent writes remain a scaling limit. Backups require local storage space and can deliberately block migration if unavailable. JavaScript gzip remains within the Phase 1 336000-byte budget, raised by 3000 bytes for the new correctness/list code.
