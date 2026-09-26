# AnimeTrack 11.5 — Daily Experience

- Your Anime Day on PC; collapsible daily shortcut on iPhone so TO WATCH stays near the top.
- Continue-watching with same shared personal library, next released episode and guarded Undo.
- Today's verified airing schedule with a link to the personal calendar.
- Weekly goal progress from real dated watch history and direct access to recommendations.
- Ongoing airing series stay in Watching when caught up, and resurface automatically when an episode becomes available. No unreleased episode may be marked watched.
- Safer cross-device cloud writes: conditional update by the last seen `updated_at`, with an explicit conflict warning and no silent overwrite if another device saved first. Local changes remain available; users choose whether to refresh from cloud or overwrite.
- Original AnimeTrack amethyst/teal theme retained; iPhone layout is responsive from 320px, desktop feature is separate.
- No new database tables, new accounts or modifications to existing user payloads.

Verification: 47/47 automated smoke tests plus simulated account browser checks at 320, 390, 430, and 1365 px. Browser checks use a stubbed Supabase account, not a real user's data.
