# AnimeTrack 11.4 — Mobile Episode Hub

## Changes
- iPhone episode feed with To Watch / Upcoming tabs and list/grid toggle, styled in AnimeTrack's original violet palette.
- Compact poster-left cards, large one-tap watched control and automatic next *released* episode.
- Watch History with collapsed 2-item preview and optional full history.
- Watching shows not touched for seven days appear under Not Watched in a While.
- Upcoming entries sourced from the existing personal schedule, sorted and grouped by local date; unavailable titles are not invented and unreleased episodes are not marked watched.
- Individual episode overlay has smaller imagery, thumb-sized actions, iPhone safe-area spacing and resets scroll on episode changes.
- The existing desktop experience, user accounts and Supabase data model are unchanged.

## Validation
- `npm test` (41 passing)
- `node --check` on changed JavaScript
- 320/390/430-pixel browser rendering without horizontal overflow

## Production deployment
- Publish through GitHub main; Vercel production alias is https://animetrack-flax.vercel.app/
