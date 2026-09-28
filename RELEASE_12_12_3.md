# AnimeTrack 12.12.3 — cloud-first account storage

- Supabase is the canonical full library for signed-in accounts; every account remains isolated by the existing `user_id` RLS policies.
- Browser localStorage now keeps a compact recovery snapshot instead of duplicating the full episode metadata payload. Watched progress, history, statuses, favorites, personal ratings, notes, rewatch data, season identity and airing data remain in the recovery copy.
- Reproducible episode details such as synopsis images/URLs and page-cache markers are omitted locally and restored from the cloud/catalog when needed.
- Pending compact progress is merged onto the rich server copy before retrying a cloud upload, so local recovery never erases the richer server metadata.
- A synced cloud account may install an app update even if the local recovery copy is unavailable; updates remain blocked only while a cloud save is active or when unsynced progress has no local recovery copy.
- The 12.12.3 service worker auto-activates once to escape the 12.12.2 quota/update deadlock on iPhone. Future releases can return to approval-based activation.
