# AnimeTrack 12.11.0 — persistence and stylesheet consolidation

Manual library edits, imports, deletions, ratings, favorites, season changes, bulk episode marking, notes and catalog additions now stop before success feedback when persistence fails. The in-memory library is rolled back so a later save cannot accidentally commit a rejected operation. Weekly goals no longer claim a completed cloud upload before it happens.

Activity is no longer silently truncated to the last 2,000 records when recording, loading, importing or normalizing cloud data. Existing history is preserved; previously discarded history cannot be reconstructed without an older backup. Storage quota recovery and explicit backup safeguards remain in effect.

The browser and offline shell load one generated stylesheet instead of 33. Source files remain editable, and scripts/styles-manifest.json records their exact cascade order. Run npm run build:css after editing CSS. npm test rejects stale bundles. This preserves the current appearance; it does not remove or reorder overlapping style rules.

Validation: 146 automated tests, including failed edit/delete/import rollback, preservation of 2,501 activity records and bundle integrity. No database migration or SMTP changes. Production and CI browser checks are verified separately after publishing.
