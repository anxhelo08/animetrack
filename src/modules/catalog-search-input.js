/** Keep search fields separate from credential forms and discard saved-email autofill. */
export function protectCatalogSearchInputs(inputs, email) {
  const checks = [];
  for (const input of inputs.filter(Boolean)) {
    const form = document.createElement('form');
    form.id = input.id + '-search-form';
    form.autocomplete = 'off';
    form.hidden = true;
    document.body.append(form);
    input.setAttribute('form', form.id);
    input.type = 'search';
    input.name = 'anime-title-' + input.id;
    input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'none');
    input.spellcheck = false;
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-form-type', 'other');
    const discard = (event) => {
      const saved = String(email() || '')
        .trim()
        .toLowerCase();
      if (
        !saved ||
        input.value.trim().toLowerCase() !== saved ||
        ['insertText', 'insertFromPaste'].includes(event?.inputType)
      )
        return;
      input.value = '';
      event?.stopImmediatePropagation();
      input.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }),
      );
    };
    checks.push(discard);
    input.addEventListener('input', discard, true);
    input.addEventListener('change', discard, true);
    input.addEventListener('focus', () => requestAnimationFrame(() => discard()));
    form.addEventListener('submit', (event) => event.preventDefault());
  }
  return () => checks.forEach((check) => check());
}

/** Cover newly mounted library, manga, calendar and phone searches without changing account inputs. */
export function installSearchProtection(email) {
  const selector =
    'input[type="search"],input[id$="query"],input[id$="search"],input[id="at124-command-input"]';
  const apply = (root) => {
    const fields = [...(root.querySelectorAll?.(selector) || [])];
    if (root.matches?.(selector)) fields.push(root);
    for (const input of fields) {
      if (['email', 'password'].includes(input.type)) continue;
      input.type = 'search';
      input.name = 'at-search-' + (input.id || 'titles');
      input.autocomplete = 'off';
      input.setAttribute('autocapitalize', 'none');
      input.setAttribute('autocorrect', 'off');
      input.spellcheck = false;
      input.setAttribute('data-1p-ignore', 'true');
      input.setAttribute('data-lpignore', 'true');
      input.setAttribute('data-form-type', 'other');
      // Search-only forms keep native Enter/submit behavior. Outside a form use one neutral form.
      if (!input.form) {
        let form = document.getElementById('at-search-only-form');
        if (!form) {
          form = document.createElement('form');
          form.id = 'at-search-only-form';
          form.hidden = true;
          form.autocomplete = 'off';
          form.addEventListener('submit', (event) => event.preventDefault());
          document.body.append(form);
        }
        input.setAttribute('form', form.id);
      } else if (!input.form.querySelector('input[type="email"],input[type="password"]'))
        input.form.autocomplete = 'off';
    }
  };
  const deliberate = new WeakMap();
  const discard = (event) => {
    const input = event?.target;
    if (!input?.matches?.(selector)) return;
    if (['insertText', 'insertFromPaste'].includes(event.inputType)) {
      deliberate.set(input, input.value);
      return;
    }
    if (deliberate.get(input) === input.value) return;
    const saved = String(email() || '')
      .trim()
      .toLowerCase();
    if (!saved || input.value.trim().toLowerCase() !== saved) return;
    input.value = '';
    event.stopImmediatePropagation();
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }),
    );
  };
  document.addEventListener('input', discard, true);
  document.addEventListener('change', discard, true);
  document.addEventListener('focusin', (event) => {
    if (event.target.matches?.(selector))
      requestAnimationFrame(() => discard({ target: event.target, stopImmediatePropagation() {} }));
  });
  const observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (node.nodeType === 1) apply(node);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  apply(document);
  return () => {
    for (const input of document.querySelectorAll(selector))
      discard({ target: input, stopImmediatePropagation() {} });
  };
}
