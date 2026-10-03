import createDOMPurify from 'dompurify';

export function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

// Only generated classes reach CSS. Untrusted values never become declarations.
export function percentClass(value, axis = 'w') {
  const number = Number(value);
  const percent = Number.isFinite(number) ? Math.round(Math.max(0, Math.min(100, number))) : 0;
  return `at-percent-${axis === 'h' ? 'h' : 'w'}-${percent}`;
}

export function setPercent(node, value, axis = 'w') {
  if (!node) return;
  const prefix = `at-percent-${axis === 'h' ? 'h' : 'w'}-`;
  for (const name of [...node.classList]) if (name.startsWith(prefix)) node.classList.remove(name);
  node.classList.add(percentClass(value, axis));
}

/** One HTML boundary for both new templates and legacy feature renderers. */
export function createHTML(window) {
  const purifier = createDOMPurify(window);
  // Search fields must never be mistaken for account/contact fields by autofill.
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'INPUT') return;
    if (
      node.getAttribute('type') !== 'search' &&
      !/(?:search|query|command-input)$/.test(node.id || '')
    )
      return;
    if (['email', 'password'].includes(node.getAttribute('type'))) return;
    node.setAttribute('type', 'search');
    node.setAttribute('name', 'at-search-' + (node.id || 'titles'));
    node.setAttribute('autocomplete', 'off');
    node.setAttribute('autocapitalize', 'none');
    node.setAttribute('autocorrect', 'off');
    node.setAttribute('spellcheck', 'false');
    node.setAttribute('enterkeyhint', 'search');
    node.setAttribute('data-lpignore', 'true');
    node.setAttribute('data-1p-ignore', 'true');
  });
  const fragments = new WeakSet();
  const policy = {
    USE_PROFILES: { html: true, svg: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'link', 'meta'],
    FORBID_ATTR: ['style', 'srcdoc'],
  };
  const sanitize = (value) => purifier.sanitize(String(value ?? ''), policy);
  const fragment = (value) => {
    const result = Object.freeze({ toString: () => value });
    fragments.add(result);
    return result;
  };
  // This bridge sanitizes existing HTML; it never marks arbitrary input as trusted.
  const markup = (value) => fragment(sanitize(value));
  const interpolate = (value) =>
    Array.isArray(value)
      ? value.map(interpolate).join('')
      : value && fragments.has(value)
        ? String(value)
        : escapeHTML(value);
  const html = (strings, ...values) => {
    if (!Array.isArray(strings?.raw)) throw new TypeError('Use html as a tagged template');
    return markup(
      strings.reduce(
        (result, part, index) =>
          result + part + (index < values.length ? interpolate(values[index]) : ''),
        '',
      ),
    );
  };
  const renderHTML = (node, value) => {
    if (node) node.innerHTML = sanitize(value);
  };
  const insertHTML = (node, position, value) => {
    if (node) node.insertAdjacentHTML(position, sanitize(value));
  };
  const replaceHTML = (node, value) => {
    if (node) node.outerHTML = sanitize(value);
  };
  return Object.freeze({
    html,
    markup,
    sanitize,
    renderHTML,
    insertHTML,
    replaceHTML,
    escapeHTML,
    percentClass,
    setPercent,
  });
}
