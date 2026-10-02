// Fixed SVG paths: decorative icons always accompany a visible text label.
const paths = {
  news: 'M4 3h16v18H4z M8 7h8 M8 11h3v4H8z M14 11h2 M14 15h2 M8 18h8',
  home: 'm3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9',
  explore: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
  library: 'M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h8',
  collections: 'M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h8',
  diary: 'M3 12h4l3-8 4 16 3-8h4',
  watch: 'm8 4 12 8-12 8z',
  completed: 'm5 12 4 4 10-10',
  paused: 'M8 4v16 M16 4v16',
  close: 'm6 6 12 12 M18 6 6 18',
  planning: 'm12 3 9 9-9 9-9-9z',
  movies: 'M3 7h18v14H3z M3 7V3h18v4 M7 3l3 4 M14 3l3 4',
  trending: 'm3 17 6-6 4 4 8-10 M15 5h6v6',
  new: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  top: 'm12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z',
  genres: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
  studios: 'M3 21V7h18v14 M8 7V3h8v4 M7 11h2 M15 11h2 M7 15h2 M15 15h2 M10 21v-3h4v3',
  filters: 'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M10 15v6',
  sync: 'm4 8 4-4H20 M20 16l-4 4H4 M4 4v4h4 M20 20v-4h-4',
  notifications: 'M5 16h14l-2-3V9a5 5 0 0 0-10 0v4z M10 20h4',
  recommendations: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  calendar: 'M3 5h18v16H3z M3 10h18 M8 2v6 M16 2v6',
  wrapped:
    'M7 3h10v7a5 5 0 0 1-10 0z M7 6H3v3a4 4 0 0 0 4 4 M17 6h4v3a4 4 0 0 1-4 4 M12 15v6 M7 21h10',
  profile: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21a8 8 0 0 1 16 0',
  friends:
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21a7 7 0 0 1 14 0 M17 3a4 4 0 0 1 0 8 M19 14a7 7 0 0 1 3 7',
  moderation: 'm12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6z m-4 10 3 3 5-6',
};
export function navIcon(name) {
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name] || paths.library}"/></svg>`;
}
