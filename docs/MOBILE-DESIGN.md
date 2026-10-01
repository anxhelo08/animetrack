# Mobile design

The phone layout uses neutral dark surfaces, lilac accents, artwork-led cards and
five primary destinations: Home, Discover, Library, Activity and Profile.
The light/system theme preference remains available.

## Composition

- Home follows the supplied episode-list reference: Për të parë / Së shpejti tabs,
  horizontal poster rows, episode titles, circular mark-watched buttons, list/grid
  views, unfinished older titles, and upcoming episodes grouped by confirmed date.
  Upcoming rows cannot be marked before airing; episode links open their specific
  season and number. Empty states reflect the library without fabricated dates.
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
- Profile presents identity, Profili/Ditari/Statistikat/Cilësimet/Miqtë navigation, favorites,
  history, achievements, ratings and notes. Calendar, friends and notification
  screens share the same surfaces and spacing.

The guest welcome contains nine distinct anime titles. Three original covers are
served locally at 840px; six additional covers use remote sources and AniList
extraLarge metadata without blocking authentication. Broken artwork is hidden.
Poster hosts are allowed by the cloud network policy; fixture tests use local artwork.

## Implementation

`src/modules/media-card.js` exposes Standard, ContinueWatching, Upcoming, Compact
and Activity variants. It escapes text and delegates actions; artwork URLs are
validated by the existing poster helper.

`src/modules/mobile-presentation.js` composes existing data and controls without
writing account or library state. `src/styles/mobile-premium.css` scopes the new
layout to phones up to 760px; tests exercise the intended 320–430px range.
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

The mobile browser tests cover 320, 375, 390 and 430px, keyboard/accessibility checks,
read-only navigation, media filtering, studio retries, episode marking and undo,
and secondary screens. Product, routing, release-feedback and theme regression
tests also cover Chromium desktop and mobile.

In the prepared cloud environment, use the external
`/workspace/animetrack-playwright.config.mjs` with `--config` to run installed
system Chromium. This avoids the repository's single-process browser flags.
WebKit downloads remain blocked by network policy; real-device Safari and live
authenticated provider behavior were not validated by these fixture tests.


The mobile home now separates last-watched history (green check indicators),
currently watching (mark-next actions without checks), and titles untouched for
more than seven days. Confirmed future releases use neutral clock indicators.
Marking an available episode updates these groups immediately through the existing
tracking controller. Imported progress without event history shows its last known
watched episode. The bottom navigation is docked to the screen edge at 58px plus safe-area padding. The main layout reserves its space once; duplicate app/body padding is removed.
Diary controls and heatmap columns may shrink within the viewport; controls use
`touch-action: manipulation` and form fields use 16px type to avoid accidental
browser zoom. Pinch zoom remains available. Repeated active navigation is ignored,
unchanged home markup is retained, and hidden legacy home rendering is skipped on
phones. Chromium tests cover repeated taps, viewport scale, activity overflow,
section movement after tracking, and mark/undo; actual iOS hardware remains untested.


Newly released episodes with a confirmed timestamp appear at the top of Watching
with an “Episod i ri” badge, even if the series was completed or last watched over
a week ago. A local timer updates the view at the next known release boundary;
no network request or library mutation is needed to unlock a known airing date.
The timer pauses when hidden and rechecks when returning. Marking the episode
removes the badge. Unknown planned episode totals never create new-release badges.
Discover and library tools wrap within the safe area; filter chips are all visible.
Navigation uses a 120ms entrance and 240ms press feedback, disabled by
reduced-motion preferences. Tests exercise the six-watched → seventh-released
scenario using the browser clock, including marking and preservation of progress.


Entering Home returns to the Watching tab and scrolls toward its next episodes.
Last-watched rows appear dimmer above it; their green check removes that exact
episode from watched progress through the existing controller. Marking or unmarking
updates progress immediately and animates the row for 220ms without delaying the
transaction. Unchanged episode rows keep their DOM nodes and artwork. History
keeps the latest six distinct watched episodes in chronological order, including
multiple episodes of the same title. The newest enters at the bottom; existing
rows shift upward. Imported progress contributes its last unlogged episode from
the latest watched part without creating history events.
Reduced-motion preferences disable movement and press effects.

The successful sync banner is hidden on phones. Saving and pending changes use
a compact floating status above navigation, keeping list positions stable.
Offline states, conflicts and errors remain visible. Navigation does not initiate a library read
or upload. A fixture test counts library queries across all five destinations and
confirms that an episode transaction still uploads. Background sync remains active.


Mobile tracking no longer rebuilds a hidden library grid or the retired home panels. Entering Library renders
the latest progress; repeated navigation reuses unchanged cards, including the
empty-state handler. The owner boundary clears retained cards before another
account can use the view. Stress tests exercise 100 titles and 50 consecutive
navigation actions with Chromium CPU throttled by four.

Installed PWA navigation uses the worker's precached release, so HTML, scripts
and styles belong together. New workers still require the existing guarded update
action. Public assets from the current and two preceding releases remain cached
for older open tabs; authentication requests are never runtime cached. A small
startup stylesheet and native hidden attribute keep the legacy page invisible if
a release stylesheet fails, and offer a retry without deleting local progress.
Fault-injection tests cover a deployment mismatch, missing CSS, offline startup
and navigation without waiting for the network.
