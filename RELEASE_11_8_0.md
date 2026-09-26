# AnimeTrack 11.8.0 — TV Series

- Independent live-action TV library under **Seriale TV**, with a fifth iPhone navigation destination and desktop navigation entry.
- TVMaze-powered title search, show details, seasons and episodes. TVMaze is credited in the UI; its public API is CORS-enabled.
- Independent status and genre filters, sort, watch progress, episode-by-episode marking, next episode and separate TV stats.
- TV shows persist in the existing account-scoped JSON cloud payload as `tvShows`; old anime data and history remain untouched. Guest and new account libraries default to an empty TV list. Export/import includes TV progress.
- Future and undated episodes cannot be marked watched. Specials are grouped in season 0.
- Release smoke and iPhone browser checks cover isolation, TV discovery, adding Dexter, watch progress and unreleased episode lock.
