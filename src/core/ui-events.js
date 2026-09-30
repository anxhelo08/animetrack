/**
 * Delegates button actions including clicks on SVG children and nested icons.
 * Disabled buttons and events outside the root cannot run a library action.
 * @param {Document|HTMLElement} root
 * @param {(button:HTMLButtonElement,event:Event)=>void} action
 * @returns {()=>void} Stops this router without changing other listeners.
 */
export function delegateButtons(root, action) {
  /** @param {Event} event */
  const handler = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement) || button.disabled || !root.contains(button)) return;
    action(button, event);
  };
  root.addEventListener('click', handler);
  return () => root.removeEventListener('click', handler);
}
