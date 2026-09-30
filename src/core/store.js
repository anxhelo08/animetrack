/**
 * @template T
 * @typedef {{owner:string, revision:number, reason:string}} StateEvent
 */

/**
 * Observable bridge over the application's canonical library.
 * Mutations remain private until the controller confirms persistence.
 * Reading through a callback avoids a second, stale copy when cloud replaces state.
 * @template T
 * @param {()=>T} read
 * @param {()=>string} owner
 * @param {(error:unknown)=>void} onError
 */
export function createStore(read, owner, onError = () => {}) {
  /** @type {Set<(state:T,event:StateEvent<T>)=>void>} */
  const listeners = new Set();
  let revision = 0;
  return {
    getState: () => read(),
    /** @param {(state:T,event:StateEvent<T>)=>void} listener */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** @param {string} reason */
    publish(reason) {
      const state = read();
      const event = Object.freeze({ owner: owner(), revision: ++revision, reason });
      for (const listener of [...listeners]) {
        if (!listeners.has(listener)) continue;
        try {
          listener(state, event);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
