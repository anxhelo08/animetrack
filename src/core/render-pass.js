/** One animation-frame pass for all queued views, including requests made while rendering. */
export function createRenderPass(renderers, frame = requestAnimationFrame) {
  const pending = new Set();
  let scheduled = false;
  return function request(name) {
    pending.add(name);
    if (scheduled) return;
    scheduled = true;
    frame(() => {
      const names = [...pending];
      pending.clear();
      try {
        for (const key of names) renderers[key]?.();
      } finally {
        scheduled = false;
        if (pending.size) request([...pending][0]);
      }
    });
  };
}
