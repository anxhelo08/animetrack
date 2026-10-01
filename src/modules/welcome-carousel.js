/** A rotating poster deck that stops for hidden pages, dialogs and reduced motion. */
export function mountWelcomeCarousel(root, { interval = 3200 } = {}) {
  if (!root) return;
  const cards = [...root.querySelectorAll('.welcome-poster')].sort(
    (a, b) => Number(a.dataset.slot) - Number(b.dataset.slot),
  );
  const dots = [...root.querySelectorAll('[data-welcome-slide]')];
  const page = root.ownerDocument;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let automaticDone = false;
  let timer;
  const cancel = () => clearTimeout(timer);
  function schedule() {
    cancel();
    if (
      automaticDone ||
      motion.matches ||
      root.hidden ||
      page.hidden ||
      page.querySelector('.modal-backdrop.show')
    )
      return;
    timer = setTimeout(() => {
      automaticDone = true;
      select((active + 1) % cards.length);
    }, interval);
  }
  function select(index, manual = false) {
    if (manual) automaticDone = true;
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) => {
      card.dataset.slot = String((i - active + cards.length) % cards.length);
      card.setAttribute('aria-hidden', String(i !== active));
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
    const title = cards[active]?.querySelector('h2')?.textContent || '';
    root.querySelector('#welcome-selected-title').textContent = title;
    if (manual) root.querySelector('#welcome-announcement').textContent = title;
    schedule();
  }
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.welcomeSlide !== undefined)
      select(Number(button.dataset.welcomeSlide), true);
    if (button.dataset.welcomeStep) select(active + Number(button.dataset.welcomeStep), true);
  });
  page.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });
  const account = page.getElementById('account-modal');
  if (account) observer.observe(account, { attributes: true, attributeFilter: ['class'] });
  select(0);
  return { select, stop: cancel };
}
