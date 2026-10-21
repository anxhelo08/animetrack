# Mobile fourth lot — code and performance

Library filtering/ordering and card presentation now have separate owners, with
injected dependencies. The application retains its public window APIs, existing
keyed DOM path, batching, data shape, sync and duplicate checks. There is no new
state or model cache that could retain another owner's data or stale mutable rows.

Search terms are normalized once per selection. Progress ordering computes each
row's percentage once, rather than repeating it inside the comparator. Phone
sort modes that do not use recent-watch ordering skip the watch-history index.
Each card computes its shared count, released total and percentage once.

Removed 59 obsolete CSS rules across three source stylesheets: the deleted
mobile profile showcase and the unused `.mobile-library-controls` selectors.
Current `#mobile-library-controls.library-filter-panel` styling remains intact.
No additional override or `!important` declaration was added.

| Gzip bytes | Before | After | Budget |
| --- | ---: | ---: | ---: |
| Startup JavaScript | 301684 | 302202 | 305000 |
| Total JavaScript | 363444 | 363961 | 364500 |
| Startup CSS | 102117 | 100974 | 102000 |
| Total CSS | 113406 | 112263 | 113000 |

CSS budgets are new. JavaScript budgets are unchanged. The small JS increase
includes opt-in diagnostics and module boundaries. CSS startup includes both the
shell stylesheet and the eager application stylesheet, deduplicated through the
Vite manifest. Unopened feature styles count only toward total CSS.

Diagnostics are enabled only with `?profile-library=1`. Three named Performance
measures retain the latest summary, selection and DOM commit durations; no title,
account or history data is recorded or sent. The profile test uses native browser
time because Playwright's fixed-clock implementation hides Performance entries.
Early fixed-clock timings were excluded from the final native profile report.

Validation: 99 unit files / 674 tests; typecheck, lint, formatting, production build
and JS/CSS budgets passed. The first browser package passed 18 applicable cases
(12 project skips), including 320/390/430 portrait, compact landscape, async
providers, reading cover retention and card identity. The performance package
passed its 14 non-profile cases (5 skips), including PWA cached/offline releases,
missing stylesheet recovery and progressive 500-title updates. Native profiles
are recorded separately with 20 measured samples after two warmups for each of
50/500/2000 titles and 10 history records per title, at Chromium CPU 4x.

The numbers describe synthetic Chromium scenarios, not real-device INP, LCP or
field percentiles. The broader monolithic controller and legacy CSS still merit
gradual follow-up; this lot extracts the library boundary without a framework or
account-layer rewrite. Safari/WebKit is unavailable in this environment.

Reproduce profiles after `npm run build`:

```sh
npx playwright test tests/e2e/library-profile.spec.js --project=iphone-chromium --reporter=json > library-profile.json
```

The native profile rerun passed all 3 cases with all phase measures present.
Full numeric results: `mobile-fourth-lot-profile-2026-10-22.json`.

| Titles | History records | Median event → two frames (ms) | p95 (ms) |
| --- | ---: | ---: | ---: |
| 50 | 500 | 78.6 | 99.3 |
| 500 | 5000 | 77.7 | 91.4 |
| 2000 | 20000 | 123.6 | 156.4 |

These timings include animation-frame waiting and cannot be interpreted as pure
render time. At 2000 titles the median phases were 47.7 ms summary, 24.1 ms
selection and 18.6 ms commit. The summary remains the largest measured phase;
future work can target that separately without changing storage or card identity.
