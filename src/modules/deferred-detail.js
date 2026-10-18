import { createDeferredModule } from '../core/deferred-module.js';

/** Delay detail-only providers; a late import must never attach to another account's view. */
export function createDeferredDetail({ ctx, load, create, onReady = () => {} }) {
  let instance,
    mounted = false,
    requested = false;
  const attachments = new WeakMap();
  const ready = createDeferredModule(async () => {
    await load();
    instance = create();
    if (mounted) instance.mount();
    return instance;
  });
  function render() {
    if (instance) return instance.render?.() || '';
    if (!requested) {
      requested = true;
      void ready()
        .then(onReady)
        .catch(() => {
          requested = false;
          ctx.toast('Paneli nuk u ngarkua. Rihape për të provuar përsëri.');
        });
    }
    return '<p role="status">Po ngarkohet paneli…</p>';
  }
  return {
    mount() {
      if (!mounted) {
        mounted = true;
        instance?.mount();
      }
    },
    render,
    async attach(root, ...args) {
      if (!root?.isConnected) return;
      const owner = ctx.user()?.id || 'guest',
        request = {};
      attachments.set(root, request);
      const controller = await ready().catch(() => null);
      if (
        controller &&
        root?.isConnected &&
        attachments.get(root) === request &&
        owner === (ctx.user()?.id || 'guest')
      )
        return controller.attach(root, ...args);
    },
    async action(...args) {
      return (await ready()).action?.(...args);
    },
  };
}
