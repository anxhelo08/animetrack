import { createDeferredModule } from '../core/deferred-module.js';
import { refreshReadingChecks } from './reading-background.js';
import { retryFeature } from './feature-retry.js';

export function createLazyReading(
  ctx,
  importModule = () => import('./reading.js'),
  retry = () => retryFeature(ctx, 'reading'),
) {
  let instance,
    root,
    host,
    active = false,
    tab = 'library',
    command,
    activation = 0;
  const load = createDeferredModule(async () => {
    const { createReading } = await importModule();
    const reading = createReading(ctx);
    reading.mount(host);
    instance = reading;
    return reading;
  });
  function showPending(error = false) {
    if (!root) return;
    window.ATHTML.renderHTML(
      root,
      error
        ? '<p role="alert">Seksioni i leximit nuk u ngarkua.</p><button type="button" class="ghost" data-reading-retry>Rifresko dhe riprovo</button>'
        : '<p role="status">Po ngarkohet Manga &amp; Manhwa…</p>',
    );
  }
  async function activate() {
    const request = ++activation;
    try {
      const reading = await load();
      if (!active || request !== activation) return;
      reading.open('reading');
      if (command) {
        const detail = command;
        command = undefined;
        window.dispatchEvent(new CustomEvent('at-reading-command', { detail }));
      } else if (tab !== 'library') reading.switchTab(tab);
    } catch {
      if (active && request === activation) showPending(true);
    }
  }
  function mount(target) {
    if (root) return;
    host = target;
    root = document.createElement('section');
    root.id = 'reading-view';
    root.className = 'reading-view hidden';
    root.setAttribute('aria-label', 'Manga dhe Manhwa');
    host.append(root);
    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-reading-retry]')) {
        retry();
      }
    });
    const nav = ctx.el('pro-nav-reading');
    if (nav) {
      const submenu = document.createElement('nav');
      submenu.id = 'reading-subnav';
      submenu.setAttribute('aria-label', 'Nëndarjet e leximit');
      window.ATHTML.renderHTML(
        submenu,
        [
          ['library', 'Biblioteka'],
          ['discover', 'Kërkimi'],
          ['calendar', 'Kalendari'],
          ['releases', 'Njoftimet'],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="reading-subnav-button" data-reading-action="tab" data-id="${id}">${label}${id === 'releases' ? ' <span id="reading-sidebar-new" hidden></span>' : ''}</button>`,
          )
          .join(''),
      );
      nav.after(submenu);
      new MutationObserver(() => {
        if (nav.nextElementSibling !== submenu) nav.after(submenu);
      }).observe(nav.parentElement, { childList: true });
      nav.addEventListener('keydown', (event) => {
        if (!instance && event.key === 'ArrowDown') {
          event.preventDefault();
          submenu.querySelector('button')?.focus();
        }
      });
      submenu.addEventListener('keydown', (event) => {
        if (!instance && event.key === 'Escape') {
          event.preventDefault();
          nav.focus();
        }
      });
      submenu.addEventListener('click', (event) => {
        if (instance) return;
        const button = event.target.closest('[data-reading-action="tab"]');
        if (!button) return;
        tab = button.dataset.id;
        ctx.navigate('reading');
      });
    }
    window.addEventListener('at-reading-command', (event) => {
      if (instance) return;
      command = event.detail;
      ctx.navigate('reading');
    });
  }
  function open(name) {
    if (name !== 'reading') return false;
    active = true;
    if (instance) return instance.open(name);
    root.classList.remove('hidden');
    document.body.classList.add('reading-active');
    for (const id of [
      'home-view',
      'library-view',
      'upcoming-view',
      'explore-view',
      'seasons-view',
      'statistics-view',
      'pro-view',
    ])
      ctx.el(id)?.classList.add('hidden');
    showPending();
    void activate();
    return true;
  }
  function hide() {
    active = false;
    activation++;
    command = undefined;
    instance?.hide();
    root?.classList.add('hidden');
    document.body.classList.remove('reading-active');
  }
  return {
    mount,
    open,
    hide,
    render: (...args) => instance?.render(...args),
    refreshBackground: () => (instance ? instance.refreshBackground() : refreshReadingChecks(ctx)),
  };
}
