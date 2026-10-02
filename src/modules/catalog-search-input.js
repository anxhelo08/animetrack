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
