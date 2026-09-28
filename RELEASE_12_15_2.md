# AnimeTrack 12.15.2 — Rich IMDb-ID movie search

- Cinemeta is now the primary zero-key movie source, using IMDb IDs and rich poster/metadata payloads.
- Provider order: TMDB when configured → Cinemeta/IMDb ID → OMDb when configured → Wikidata final fallback.
- Movie cards can now show poster, year, description and IMDb rating without a user API key when Cinemeta has them.
- Full movie detail loads Cinemeta metadata by IMDb ID, including runtime, genres, director, cast, description and imagery when available.
- IMDb IDs are preserved for cross-provider deduplication.
- Added regression coverage for Avengers: Endgame and Obsession.
- No Supabase schema change and no loss of existing movie/anime/TV progress.
