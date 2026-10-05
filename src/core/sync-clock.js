/** Server-aligned wall time advances with a monotonic timer, immune to phone-clock edits. */
export function createSyncClock({ wall = Date.now, monotonic = () => performance.now() } = {}) {
  let observed = false,
    offset = 0,
    anchor = wall(),
    tick = monotonic();
  function restore(value) {
    observed = false;
    offset = Number.isFinite(Number(value)) ? Number(value) : 0;
    anchor = wall() + offset;
    tick = monotonic();
  }
  function observe(serverTime, started = monotonic()) {
    const time = typeof serverTime === 'string' ? Date.parse(serverTime) : NaN;
    if (!Number.isFinite(time)) return false;
    const end = monotonic();
    const candidate = time + Math.max(0, end - started) / 2;
    anchor = observed ? Math.max(candidate, anchor + Math.max(0, end - tick)) : candidate;
    observed = true;
    tick = end;
    offset = anchor - wall();
    return true;
  }
  return {
    restore,
    observe,
    offset: () => offset,
    now: () => anchor + Math.max(0, monotonic() - tick),
    iso: () => new Date(anchor + Math.max(0, monotonic() - tick)).toISOString(),
  };
}
