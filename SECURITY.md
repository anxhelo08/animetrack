# Security

Report vulnerabilities privately through GitHub's **Security → Report a vulnerability** when enabled. Otherwise contact the repository owner privately; do not post tokens, personal data, or exploit details in a public issue. Include the affected release, reproduction steps using synthetic data, and expected impact.

## Browser boundaries

- Supabase is installed from npm at an exact version and bundled into same-origin, content-hashed assets. The public project configuration is frozen and cannot be overridden through localStorage or the interface. A publishable key is public; database RLS remains the authorization boundary.
- `src/modules/safe-html.js` owns all HTML writes. New views use its auto-escaping `html` tagged template with quoted attributes. Nested fragments are branded. The `markup` bridge and all DOM insertion methods sanitize with DOMPurify, including existing legacy renderers. Never interpolate values into tag names, attribute names, scripts, or CSS.
- `ATSecurity136.text()` produces plain text, not safe HTML. Pass it through the tagged template or use `textContent`.
- The CSP permits only same-origin scripts/styles and named API hosts. Progress meters use finite CSS classes. Inline handlers, executable embeds and inline styles are stripped at the HTML boundary. CSP is defense in depth, not a replacement for escaping and authorization.
- Profile avatar URLs must point to object storage in this application's Supabase project. Other URLs fall back to the user's emoji; arbitrary poster provider URLs are not accepted as avatars.
- AniList implicit OAuth still stores a long-lived token in browser localStorage. Page scripts can read it. The interface discloses this and offers username-only access and local token removal. Provider revocation is required to invalidate a token. A recent, explicit AniList attempt is required before consuming its callback; Supabase refresh-token callbacks are excluded. Moving OAuth to the server remains scheduled for 13.9.

## Validation and releases

Use the Node version in `.nvmrc`, then `npm ci`, `npm run lint`, `npm run format:check`, `npm run audit`, and `npm test`. CI also runs desktop Chromium, mobile Chromium and mobile WebKit browser tests under production security headers. SDK mocks are confined to test network interception; the guest bootstrap security test loads the real SDK.

Dependabot checks npm dependencies and GitHub Actions weekly. Review changes and lockfile updates before merging. Audit failures at high or critical severity block CI; lower-severity findings require triage.

Do not store service-role keys, database passwords, OAuth client secrets, VAPID private keys, or deployment credentials in browser code, repository files or screenshots. Environment settings and any database migration require separate verification. This frontend release does not replace the planned 13.9 baseline/RLS audit, distributed rate limits or server OAuth work.
