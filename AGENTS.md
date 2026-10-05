# AnimeTrack – rules for coding agents

- Stack: Vite, vanilla JS (large src/app.js), Supabase, Vercel, vitest + Playwright. UI text is Albanian; keep it Albanian.
- Before finishing any task run: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`. If something cannot run, say so explicitly; never claim it passed.
- Security rules (do not weaken): keep the strict CSP in vercel.json (no inline style attributes, no new script/connect hosts), render HTML only through the existing ATHTML/html helper, avatars only through safeAvatarURL, never log tokens.
- Never break existing user data: any change to the stored library shape needs a backward-compatible migration, a backup before migrating, and tests with old-format fixtures.
- Prefer small, reviewable commits. Do not rewrite or reformat unrelated code. Do not rename public window.* globals in this task.
- Add behaviour tests, not tests that read source text with readFileSync.
- If a requirement is ambiguous, state your assumption in the final report instead of guessing silently.
