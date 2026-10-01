// Fixed SVG paths: decorative icons always accompany a visible text label.
const paths = {
  home: 'm3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9',
  explore: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
  library: 'M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h8',
  collections: 'M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h8',
  diary: 'M3 12h4l3-8 4 16 3-8h4',
  watch: 'm8 4 12 8-12 8z',
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
