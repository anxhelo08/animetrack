# Mobile third lot — 22 October 2026

Reading now prioritizes Library and Search. More retains Manga/Manhwa scope,
calendar, releases, collections, recommendations, integration and the source link.
Detailed status filters and reading totals use disclosures. The keyed card/image
rendering path and tracking data are unchanged.

Activity presents events and undated progress before statistics. Search and filters
are disclosed on request and remain open when a filter rerenders the screen.
Profile brings favorites and recent history forward on compact screens. Settings
has a visible label; installation is available inside profile settings. Removed the
unused, permanently hidden profile showcase. Discover separates the three media
choices from its six discovery choices, retaining all nine destinations.

Validation: typecheck, lint, formatting, unit suite, production build, performance
budget and focused Chromium desktop/phone regressions. Safari/WebKit is unavailable
in this environment. No schema, authentication, sync or library migration changes.

Results: 97 unit files / 668 tests passed. The mobile lots package passed 12
applicable cases (6 skips); the wider 62-case package had 39 applicable cases
and 23 project-specific skips. Three failures were corrected and confirmed:
a duplicate manual-add control, an outdated source-link name and an outdated
watch-test flow that omitted the Planned destination. New lot-three cases also
confirm installation/sharing remain reachable in Settings and navigation does
not change library state. Startup gzip 301684/305000 bytes; total JavaScript
gzip 363444/364500 bytes. Chromium coverage includes 320/390/430 portrait and
compact landscape from the earlier-lot regression package.
