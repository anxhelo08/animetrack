# AnimeTrack 12.12.1 — Franchise deduplication fix

- Franchise traversal now follows AniList relations that represent the same release family: PREQUEL, SEQUEL, ALTERNATIVE, SUMMARY, COMPILATION, CONTAINS and PARENT. Spin-offs and side stories remain excluded.
- AniList/Jikan title aliases are stored per timeline part so English and romaji names such as Demon Slayer / Kimetsu no Yaiba can resolve to one library card.
- Reconciliation now also closes over shared AniList/MAL identifiers, preserving watched episodes and history when old duplicate cards are merged.
- Existing 12.12.0 cards are revalidated once when opened, so already-hydrated libraries receive the corrected grouping without repeated network work.
- Service-worker cache and release version bumped to 12.12.1.
