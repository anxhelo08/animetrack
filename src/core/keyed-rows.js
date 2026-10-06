/** Reconcile sanitized, delegated-action rows without replacing unchanged DOM nodes. */
export function createKeyedRows({ root, html }) {
  const rows = new Map();

  return {
    render(nextRows) {
      const wanted = new Set();
      const unique = [];
      for (const row of nextRows) {
        const key = String(row.key);
        if (wanted.has(key)) continue;
        wanted.add(key);
        unique.push({ ...row, key });
      }

      if (rows.size === 0 && root.childNodes.length === 0 && unique.length) {
        html.renderHTML(root, unique.map((row) => row.markup).join(''));
        if (root.childElementCount === unique.length && root.childNodes.length === unique.length) {
          [...root.children].forEach((node, index) =>
            rows.set(unique[index].key, { node, markup: unique[index].markup }),
          );
          return;
        }
        root.replaceChildren();
      }

      for (const key of rows.keys()) if (!wanted.has(key)) rows.get(key).node.remove();

      let previous = null;
      for (const row of unique) {
        let cached = rows.get(row.key);
        if (!cached || cached.markup !== row.markup) {
          const draft = document.createElement('div');
          html.renderHTML(draft, row.markup);
          const next = draft.firstElementChild;
          if (!next || draft.childElementCount !== 1 || draft.childNodes.length !== 1) continue;
          if (!cached) cached = { node: next, markup: row.markup };
          else {
            cached.node.replaceWith(next);
            cached = { node: next, markup: row.markup };
          }
          rows.set(row.key, cached);
        }

        const position = previous ? previous.nextSibling : root.firstChild;
        if (position !== cached.node) {
          const focused = cached.node.contains(document.activeElement)
            ? document.activeElement
            : null;
          root.insertBefore(cached.node, position);
          focused?.focus({ preventScroll: true });
        }
        previous = cached.node;
      }
    },
    reset() {
      rows.clear();
      root.replaceChildren();
    },
  };
}
