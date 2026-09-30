export const THEME_KEY = 'animetrack_theme_144';
export const THEMES = ['dark', 'light', 'auto'];

/** Device preference only; never part of library/cloud data. */
export function createTheme({ storage, document: page, media }) {
  let preference = 'dark';
  try {
    const saved = storage.getItem(THEME_KEY);
    if (THEMES.includes(saved)) preference = saved;
  } catch {}
  function apply() {
    const resolved = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
    page.documentElement.dataset.theme = resolved;
    page.documentElement.dataset.themePreference = preference;
    page
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'light' ? '#f4f5fa' : '#0c0d16');
    page.querySelector('meta[name="color-scheme"]')?.setAttribute('content', resolved);
    return resolved;
  }
  function set(value) {
    if (!THEMES.includes(value)) return false;
    try {
      storage.setItem(THEME_KEY, value);
    } catch {
      return false;
    }
    preference = value;
    apply();
    return true;
  }
  const systemChanged = () => {
    if (preference === 'auto') apply();
  };
  media.addEventListener('change', systemChanged);
  apply();
  return {
    set,
    get: () => preference,
    resolved: apply,
    dispose: () => media.removeEventListener('change', systemChanged),
  };
}

export function mountThemeSettings(theme, root, { toast = () => {} } = {}) {
  if (!root || root.querySelector('#theme-settings')) return;
  const section = document.createElement('section');
  section.id = 'theme-settings';
  section.className = 'theme-settings';
  const title = document.createElement('h3');
  title.textContent = 'Pamja e aplikacionit';
  const label = document.createElement('label');
  label.htmlFor = 'theme-select';
  label.textContent = 'Tema';
  const select = document.createElement('select');
  select.id = 'theme-select';
  for (const [value, text] of [
    ['dark', 'E errët'],
    ['light', 'E çelët'],
    ['auto', 'Sipas pajisjes'],
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = theme.get();
  select.addEventListener('change', () => {
    if (!theme.set(select.value)) {
      select.value = theme.get();
      toast('Tema nuk u ruajt. Provo përsëri.');
    }
  });
  const help = document.createElement('p');
  help.textContent = 'Zgjedhja ruhet në këtë pajisje. Tema automatike ndjek pamjen e sistemit.';
  section.append(title, label, select, help);
  root.prepend(section);
}
