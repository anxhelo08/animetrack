# AnimeTrack 12.2.0 — security and functional audit
- Supabase migration 20260927121525 applied: removed TRUNCATE/DDL client privileges; constrained comment/report inserts; blocked client writes to push dispatcher status; added two missing FK indexes.
- No user account, anime library, episode progress, or social record deleted.
- Browser: moved public Supabase config to its own JS resource and pinned supabase-js; deployed CSP, no framing, no MIME sniffing, no referrer leak and limited browser permissions.
- Added security regression tests and kept existing full smoke and Chromium/WebKit/desktop browser suites.
- Remaining manual dashboard item: enable Supabase leaked-password protection. SMTP delivery still requires live mailbox delivery testing.
