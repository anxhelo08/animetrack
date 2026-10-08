# AnimeTrack 14.29.0 — Update 1: lighter initial loading

## Scope

First of the six agreed updates. This release splits the reading and news interfaces
and their styles out of initial loading. Their navigation stays available immediately.
Reading release checks still run without downloading the reading interface.

The app retains its existing design, Albanian UI, account model, library format,
strict CSP, safe HTML rendering and public window globals.

## Implementation

- Shared, demand-driven module imports with concurrent request deduplication.
- A small reading navigation/loading shell; existing reading UI adopts the shell
  when its JavaScript and CSS have loaded.
- Late module completion cannot take navigation back from the user's new destination.
- Reading server checks retain owner validation, chapter progress and rollback when
  a local save fails. Empty reading libraries skip the unnecessary check query.
- Failed feature downloads offer a document reload, guarded by the existing save
  safety check. A temporary owner-scoped session hint restores that destination.
- Reading/news chunks are excluded from service-worker installation precaching.
  The worker caches public hashed feature chunks after their first actual use;
  previously cached releases remain available to older tabs. A first-time unopened
  feature requires a connection.

## Budgets and measurements

Baseline: commit 8a22aa4 (14.28.1), built using the same Node 22 toolchain.
The startup manifest traversal follows static imports of the actual modules that
main.js waits for, excludes optional dynamic imports, and counts shared files once.

- Baseline initial JavaScript: 330,501 gzip bytes.
- Initial JavaScript after splitting: 306,717 gzip bytes, 7.2% less.
- Main CSS: 609.13 → 569.35 KB before compression; 104.62 → 98.01 KB gzip.
- Features chunk: 189.01 → approximately 95 KB before compression.
- Independently compressed chunks slightly increase total JavaScript. The former
  341,000-byte total limit is replaced with a 310,000-byte startup limit and a
  346,000-byte total limit. This tradeoff is explicit; total bundle size did not shrink.

Local 500-title Chromium measurements at 4× CPU varied. The first comparison
was 3468 → 3601 ms for home readiness and 1645 → 1730 ms for episode response.
These samples do not establish a response-time improvement. The primary verified
change is reduced initial code/style loading, with a separate slow-connection check.
Physical iPhone/Safari and production field Core Web Vitals are not verified here.

## Validation

Typecheck, lint, format:check, npm test (596 tests across 87 files), build and
performance budgets passed.

The desktop and phone Chromium run passed 54 scenarios, skipped 28 cases for
inapplicable device classes and found two stale reading-workspace checks. Both
also fail against the unchanged baseline. They were corrected to select the notes
tab specifically, wait for the asynchronously loaded interface and explicitly
exercise compact mode. The four reading-workspace cases were then rerun and all passed: 56 distinct
applicable browser scenarios were verified across the runs.

The 500-title slow-connection fixture (4× CPU, 150 ms latency, 250,000 bytes/s)
measured 7354 → 6700 ms for home readiness in one before/after pair. The final local
CPU-only sample was 3340 ms for home readiness and 2450 ms for episode reaction;
reaction timing is variable and did not improve consistently. This update claims
smaller initial loading, not a universal interaction-speed gain.

New behavior tests cover demand-only loading, failed-download recovery, account
isolation, save rollback, navigation during loading and offline feature caching.
No production database schema or migration was needed.
