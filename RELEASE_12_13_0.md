# AnimeTrack 12.13.0 — Canonical Franchise Engine

- Anime structure is ID-first: AniList relation edges are authoritative; title similarity no longer auto-merges anime.
- MAL/Jikan is metadata fallback only; MAL entries are resolved back to AniList IDs when possible before franchise building.
- TV franchise membership uses Wikidata (media-franchise / part-of / follows relations). TVMaze supplies regular seasons and episode metadata.
- TV specials (season 0) never become numbered seasons.
- Global TV season numbering continues across a franchise in release order. Example: Dexter S1–S8, New Blood S9, Original Sin S10, Resurrection S11+ as new seasons arrive.
- Existing show IDs and watched progress are preserved while a TV franchise is rebuilt.
- Existing anime duplicates are repaired by shared AniList/MAL IDs; cross-provider TVMaze anime duplicates are bridged only when episode boundaries match the canonical anime timeline.
- Movies/OVA/Special entries in anime timelines do not increment TV-season numbering.
