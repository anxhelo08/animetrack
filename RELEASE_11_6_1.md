# AnimeTrack 11.6.1 — Mobile Profile & Auth Diagnostics

- New mobile-only profile: personal cover, round avatar, real episode/movie/time counts, friends, horizontal poster shelves; desktop layout and private-by-default profiles retained.
- Signup/resend now report SMTP authorization and rate-limit failures accurately. An accepted request is not a delivery receipt; obfuscated existing accounts are directed to login/recovery. Email confirmation remains enabled.
- Production email delivery to non-team addresses requires a custom SMTP provider in Supabase Authentication → SMTP Settings. Frontend code alone cannot supply SMTP credentials or prove delivery.
- PWA cache updated; responsive safe areas and auth form scrolling improved.
