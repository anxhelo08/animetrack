# AnimeTrack 12.10.2 — Release stability

Corrects the desktop Home search input race when background refresh rebuilds cards while the user types. Captures the typed value synchronously, then applies the existing debounce. Preserves the release 12.10.1 genre filters, Wrapped/achievements, filler metadata and cloud journal. No database migration or additional external permissions.

Production and iPhone/desktop smoke checks must be independently verified before calling the release live.
