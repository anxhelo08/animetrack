// Opt-in diagnostics only; no titles, account IDs or history enter the timeline.
const enabled = new URLSearchParams(globalThis.location?.search).get('profile-library') === '1';
export const libraryTick = () => (enabled ? performance.now() : null);
export function libraryMeasure(phase, start) {
  if (start === null) return;
  const name = 'animetrack:library:' + phase;
  performance.clearMeasures(name);
  performance.measure(name, { start, end: performance.now() });
}
