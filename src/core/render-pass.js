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

/** Coalesce background panel updates without painting another owner or selection. */
export function createScopedRender(
  { scope, owner, visible, render },
  frame = requestAnimationFrame,
) {
  let pending = null;
  let scheduled = false;
  function request(...args) {
    pending = { scope: scope(), owner: owner(), args };
    if (scheduled) return;
    scheduled = true;
    frame(() => {
      scheduled = false;
      const next = pending;
      pending = null;
      if (next && next.scope === scope() && next.owner === owner() && visible())
        render(...next.args);
    });
  }
  request.cancel = () => {
    pending = null;
  };
  return request;
}
