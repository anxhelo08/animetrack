# AnimeTrack 12.15.3 — Cross-device cloud sync

- Added Supabase Realtime subscription for the signed-in user's anime_libraries row.
- Changes saved on PC trigger a quiet cloud pull on an already-open mobile session, and vice versa.
- Movie add, watched, rewatch, rating and notes now request an immediate cloud flush after durable local save.
- Realtime ignores the current device's already-acknowledged revision and defers remote pulls while local writes are dirty/saving.
- Added focus, pageshow and visibility-return refreshes plus a 30-second foreground safety poll.
- Existing offline journal and optimistic revision conflict protection remain intact.
- No Supabase schema or RLS change required; anime_libraries is already in the supabase_realtime publication.
