# AnimeTrack 14.28.0

This phone refinement prioritizes response time and completing routine tracking tasks. The existing dark/purple identity, Albanian interface, desktop behavior and account controllers remain the basis of the implementation. References and their limits are recorded in [the mobile research notes](MOBILE-RESEARCH-2026-10-06.md).

## Changed behavior

- Home puts the next episode before recent history. Active and older queues initially render 20 titles each; “Shfaq më shumë” adds 20 to that queue and keeps every title reachable. The existing six-entry recent history remains available; unmarking an episode returns it to a visible queue.
- Home navigation retains the selected home tab and restores each route's session scroll position. Opening home no longer scrolls past its heading and shortcuts automatically.
- Search, reading, calendar and notification actions are easier to reach. Primary phone controls have at least 44 px targets; titles use two readable lines. Detail tabs now use Albanian labels, and the title summary belongs in “Përmbledhja”, leaving episode controls accessible in “Episodet”.
- Sync status occupies normal document space rather than covering a card or action.
- A confirmed release triggers the existing airing reconciliation before refreshing home. The upcoming view also includes future dates already present in episode metadata; unknown release dates are not invented and progress is not marked automatically.

## Rendering work

Phone refresh requests coalesce into one animation frame. Search presentation runs only on its visible route. The hidden legacy phone feed skips rendering while the current home exists; its action path still refreshes account ownership, preserving undo isolation. The library returns before doing phone work on other routes, and its desktop continue cards are no longer built while hidden on a phone. Home uses an ID lookup map when resolving upcoming titles.

Unchanged watch rows retain their nodes. Movement uses the Web Animations API on retained/current rows and respects reduced motion; the previous cloned motion ghosts and inline positioning styles were removed. Existing HTML sanitization, strict CSP and public window APIs remain intact.

## Measurement

The comparison uses the same 500-title fixture in Chromium with 4× CPU slowdown. These observations measure the fixture flow, not production INP or physical-device performance.

| Observation               |                                 Before |                               After |
| ------------------------- | -------------------------------------: | ----------------------------------: |
| First home render         |                               3,026 ms |                            3,535 ms |
| Initial home rows         | 506 (250 active, 250 older, 6 history) | 46 (20 active, 20 older, 6 history) |
| Home to library           |                                 607 ms |                              519 ms |
| Library to home           |                                 872 ms |                              116 ms |
| Selecting the current tab |                                  41 ms |                               30 ms |
| Episode reaction          |                               3,557 ms |                            2,029 ms |
| Largest startup long task |                               2,060 ms |                            1,084 ms |

This laboratory comparison shows faster return to home and episode reaction with fewer initial rows. It does not establish improved cold startup or consistent home-to-library improvement: startup remained slower and library navigation varied between follow-up runs. The final four-scenario rerun passed the benchmark assertions of less than 500 ms to return home and less than 3,000 ms for episode reaction, alongside release-time and episode-transition checks, in 23.5 seconds. The interrupted-unwatch scroll regression also passed separately in 8.6 seconds.

## Validation and limits

- Required typecheck, lint, format check, unit tests and production build passed. The final full unit run passed all 571 tests in 80 files, including the new sync-status regression; the final standalone production build and format check also passed.
- Across desktop and iPhone-sized Chromium, 33 distinct applicable browser scenarios passed across the broad run and isolated rerun. The broad run recorded 29 passed, 15 skipped and four failures; the rerun passed all five selected scenarios, resolving those four failures and repeating route scroll restoration. The broad run returned nonzero and is not reported as a clean full-suite pass.
- The unwatch fix retains its pending move until the coalesced refresh and scrolls to the returned queue. Leaving home clears the pending presentation transition so a rapid route change cannot leave scroll tracking suspended. Sync status now prefers the application main element over the hidden welcome main, with a unit regression for visibility. The workload fixture dismisses the existing episode-card modal after +1 before testing “Shfaq më shumë”; this was a test-flow correction.
- Behavior coverage includes bounded queues and expansion, route scroll restoration, hidden-feed avoidance, account-specific undo, episode actions and known release dates. A 320 px visual review covered four phone routes; its three reported layout findings were corrected.
- JavaScript gzip: 339,659 bytes across 19 chunks, within the unchanged 340,000-byte budget. No dependency, backend or stored-library schema changes.
- Physical iPhone/Safari remains untested. Browser cover fixtures are illustrative and do not establish production artwork or catalog completeness. The optional agent-browser launcher was unavailable in this sandbox; Playwright supplies the browser checks.

This extends the incumbent interface within the phone scope. The CSS changes reuse existing surface, text and purple variables; no palette, font or design-system replacement was introduced. `PRODUCT.md` and `DESIGN.md` were absent before this work and were not created or migrated as a side effect. Existing recovery backups, library records and watch history are preserved.
