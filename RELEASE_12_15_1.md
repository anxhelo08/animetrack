# AnimeTrack 12.15.1 — Movie search hotfix

- Movie search now works on a fresh device with no TMDB or OMDb credential.
- Added Wikidata/MediaWiki as a zero-key fallback for live-action movie discovery.
- Exact movie titles such as Avengers: Endgame can be found and saved without user setup.
- Wikidata movie entries preserve stable entity IDs and enrich from OMDb automatically when an OMDb key is available.
- TMDB remains the preferred rich provider when configured; Wikidata only fills the no-key / zero-result gap.
- Movie search starts in parallel with Anime/TV search to avoid unnecessary delay.
- No Supabase schema change. Existing libraries and movie entries remain compatible.
