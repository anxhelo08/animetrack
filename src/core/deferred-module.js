// Share an in-flight import, retain success and allow retry after a failed download.
export function createDeferredModule(importModule) {
  let pending;
  return () => {
    if (!pending) {
      pending = Promise.resolve()
        .then(importModule)
        .catch((error) => {
          pending = undefined;
          throw error;
        });
    }
    return pending;
  };
}
