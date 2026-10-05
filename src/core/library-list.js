/** Progressive keyed cards. Sanitization precedes every insertion or DOM patch. */
export function createLibraryList({
  grid,
  cardHTML,
  html,
  onAppend = () => {},
  batch = 30,
  Observer = globalThis.IntersectionObserver,
}) {
  let rows = [],
    scope = '',
    limit = batch;
  const cards = new Map();
  const more = document.createElement('button');
  more.type = 'button';
  more.id = 'library-load-more';
  more.className = 'ghost library-load-more';
  more.textContent = 'Shfaq më shumë tituj';
  more.hidden = true;
  grid.after(more);
  function patch(node, next) {
    if (node.nodeType !== next.nodeType || node.nodeName !== next.nodeName) {
      node.replaceWith(next);
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
      return;
    }
    for (const attr of [...node.attributes])
      if (!next.hasAttribute(attr.name)) node.removeAttribute(attr.name);
    for (const attr of [...next.attributes])
      if (node.getAttribute(attr.name) !== attr.value) node.setAttribute(attr.name, attr.value);
    const oldChildren = [...node.childNodes],
      newChildren = [...next.childNodes];
    newChildren.forEach((child, i) => {
      if (oldChildren[i]) patch(oldChildren[i], child);
      else node.append(child);
    });
    oldChildren.slice(newChildren.length).forEach((child) => child.remove());
  }
  function draw() {
    const visible = rows.slice(0, limit),
      wanted = new Set(visible.map((row) => row.id));
    for (const node of [...grid.children]) if (!wanted.has(node.dataset.libraryId)) node.remove();
    let previous = null;
    for (const row of visible) {
      const markup = cardHTML(row);
      let cached = cards.get(row.id);
      if (!cached || cached.markup !== markup) {
        const draft = document.createElement('div');
        html.renderHTML(draft, markup);
        const next = draft.firstElementChild;
        if (!cached) cached = { node: next, markup };
        else {
          patch(cached.node, next);
          cached.markup = markup;
        }
        cached.node.dataset.libraryId = row.id;
        cards.set(row.id, cached);
      }
      const position = previous ? previous.nextSibling : grid.firstChild;
      if (position !== cached.node) grid.insertBefore(cached.node, position);
      previous = cached.node;
    }
    more.hidden = limit >= rows.length;
    onAppend();
  }
  function append() {
    if (limit < rows.length) {
      limit += batch;
      draw();
    }
  }
  more.addEventListener('click', append);
  const observer = Observer
    ? new Observer(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && !more.hidden) append();
        },
        { rootMargin: '250px' },
      )
    : null;
  observer?.observe(more);
  return {
    render(nextRows, nextScope) {
      if (nextScope !== scope) {
        scope = nextScope;
        limit = batch;
        cards.clear();
      }
      rows = nextRows;
      draw();
    },
    append,
    destroy() {
      observer?.disconnect();
      more.remove();
      cards.clear();
    },
  };
}
