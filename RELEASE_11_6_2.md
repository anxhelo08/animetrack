# AnimeTrack 11.6.2 — Email confirmation callback

- Canonical production redirect for sign-up, resend, and password recovery; preview hostnames no longer become production email callback targets.
- Graceful expired/used-token guidance and confirmation return handling, without exposing tokens in messages.
- Supabase dashboard must allow https://animetrack-flax.vercel.app/ and set it as Site URL. Confirm signup email template must use {{ .ConfirmationURL }}. Custom SMTP is separate and requires provider credentials.
- Email-confirmed users should sign in, not register again.
