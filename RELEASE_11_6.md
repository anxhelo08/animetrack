# AnimeTrack 11.6 — Social & Account Reliability

- Signup and login are clearly separated, including name, strong password and confirmation, email verification and resend with cooldown, and friendly Auth error feedback.
- Authenticated new users get a private profile with an exact-searchable username. No existing users are reset.
- Social activity is opt-in, restricted to friends on private profiles; switching a profile public turns sharing off.
- Yearly activity and genre statistics on mobile and PC.
- Local MAL XML / AniList CSV import with preview, explicit confirmation, deduplication and backup; existing library entries are never replaced.
- Smoke tests and mocked-browser registration flow (signup → pending confirmation → resend → confirmed login) are required in CI.

## Important deployment configuration

Supabase default SMTP cannot deliver confirmation emails to arbitrary new users. Before inviting friends, configure custom SMTP (Authentication > SMTP Settings) and a verified sender. Configure production Site URL and Redirect URLs to `https://animetrack-flax.vercel.app/`. Verify actual email delivery with a separate address; mocked browser tests cannot test mail transport.

No credential, service_role token, or private user data is included in this release. No destructive database migration is required.
