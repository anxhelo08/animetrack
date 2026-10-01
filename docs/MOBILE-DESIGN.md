# Mobile design

The phone layout uses neutral dark surfaces, lilac accents, artwork-led cards and
five primary destinations: Home, Discover, Library, Activity and Profile.
The light/system theme preference remains available.

## Composition

- Home prioritizes Continue Watching, followed by new releases, recommendations,
  trending, this week's schedule, older unfinished titles and shared friend activity.
  Empty sections describe the actual state; no demo activity or release dates are invented.
- Discover shows nine browse categories before typing and filters instant catalog
  results by media type. People uses the existing friend search. Studios uses a
  read-only AniList catalog request with an error/retry state.
- Library uses the shared Standard MediaCard, sticky status chips and a collapsed
  Filter + Sort control. Existing extra filters, imports, manual editing and repair
  tools remain accessible.
- Library details have a backdrop, primary Start/Continue/Rewatch action, and
  Overview, Timeline, Episodes, Cast & Staff and Reviews sections. Episode marking,
  bulk confirmation, pagination, ratings and metadata controls retain their existing
  handlers. Films, OVA and specials never consume a TV season number.
- Profile presents identity, Profile/Diary/Stats/Friends navigation, favorites,
  history, achievements, ratings and notes. Calendar, friends and notification
  screens share the same surfaces and spacing.

## Implementation

`src/modules/media-card.js` exposes Standard, ContinueWatching, Upcoming, Compact
and Activity variants. It escapes text and delegates actions; artwork URLs are
validated by the existing poster helper.

`src/modules/mobile-presentation.js` composes existing data and controls without
writing account or library state. `src/styles/mobile-premium.css` scopes the new
layout to phones up to 760px; tests exercise the intended 375–430px range.
Supabase, account credentials, tracking transactions and sync transport are unchanged.

## Validation

```sh
npm test
npm run lint
npm run format:check
npm run test:performance
npm run build
npx playwright test tests/e2e/mobile-premium.spec.js --project=iphone-chromium
```

The mobile browser tests cover 375, 390 and 430px, keyboard/accessibility checks,
read-only navigation, media filtering, studio retries, episode marking and undo,
and secondary screens. Product, routing, release-feedback and theme regression
tests also cover Chromium desktop and mobile.

In the prepared cloud environment, use the external
`/workspace/animetrack-playwright.config.mjs` with `--config` to run installed
system Chromium. This avoids the repository's single-process browser flags.
WebKit downloads remain blocked by network policy; real-device Safari and live
authenticated provider behavior were not validated by these fixture tests.
