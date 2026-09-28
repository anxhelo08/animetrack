# AnimeTrack 12.12.4 — one franchise, one card

- Cross-provider deduplication now detects the same anime stored once from TVMaze and once from AniList/MAL.
- AniList/MAL remains the canonical franchise timeline; TVMaze never adds duplicate seasons when a canonical anime timeline exists.
- TVMaze watched progress is mapped by cumulative episode boundaries into the AniList TV parts. This handles different provider season splits, including Demon Slayer TVMaze season 2 (18 episodes) mapping across Mugen Train Arc (7) + Entertainment District Arc (11).
- Movies, OVAs and specials remain in chronological order but do not increment the TV season number.
- Existing duplicates are repaired automatically when an online account opens, then the cleaned library is saved back to Supabase.
- Adding a TVMaze result that already belongs to an anime franchise opens the canonical card instead of creating a second card.
- Library repair also includes the provider bridge after canonical franchise refreshes.
