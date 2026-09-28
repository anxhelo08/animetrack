# AnimeTrack 12.15.0 — Movies

- Added live-action Movies as a third first-class media category beside Anime and TV.
- Universal search can include movies. TMDB is primary with a local Read Access Token; OMDb is the fallback.
- Movie entries sync through the existing per-account Supabase library.
- Movies support Plan to Watch, Watched, rewatch count, personal rating, favorites, notes, IMDb/TMDB ratings, runtime, director, cast, release date and poster/backdrop.
- TMDB collection membership renders a chronological franchise strip.
- Movie watches use dedicated history actions and do not inflate anime/TV episode counters.
- Added a Movies media filter and movie-specific cards/details.
- TMDB credential is local-device only and never written to the cloud payload.
