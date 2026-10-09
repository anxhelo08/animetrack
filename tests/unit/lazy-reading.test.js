// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import { createLazyReading } from '../../src/modules/lazy-reading.js';

let events;
beforeEach(() => {
  document.body.innerHTML =
    '<main></main><section id="home-view"></section><nav><button id="pro-nav-reading">Leximi</button></nav>';
  window.ATHTML = createHTML(window);
  events = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((name, fn, options) => {
    events.push([name, fn, options]);
    add(name, fn, options);
  });
});
afterEach(() => {
  for (const args of events) window.removeEventListener(...args);
  vi.restoreAllMocks();
});
function fixture(importer, library = []) {
  const instance = {
    mount: vi.fn(),
    open: vi.fn(() => true),
    hide: vi.fn(),
    render: vi.fn(),
    prepare: vi.fn(),
    switchTab: vi.fn(),
    refreshBackground: vi.fn(),
  };
  const ctx = {
    el: (id) => document.getElementById(id),
    navigate: (name) => reading.open(name),
    user: () => null,
    state: () => ({ readingLibrary: library }),
  };
  const importModule = importer || vi.fn(async () => ({ createReading: () => instance }));
  const retry = vi.fn();
  const reading = createLazyReading(ctx, importModule, retry);
  reading.mount(document.querySelector('main'));
  return { reading, instance, importModule, retry };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

it('keeps navigation available while code stays unloaded until the first open', async () => {
  const { reading, importModule, instance } = fixture();
  await reading.refreshBackground();
  expect(importModule).not.toHaveBeenCalled();
  expect(document.querySelectorAll('#reading-subnav button')).toHaveLength(4);
  expect(reading.open('home')).toBe(false);
  reading.open('reading');
  expect(document.querySelector('[role="status"]').textContent).toContain('Po ngarkohet');
  await settle();
  expect(instance.mount).toHaveBeenCalledOnce();
  expect(instance.open).toHaveBeenCalledWith('reading');
  reading.hide();
  reading.open('reading');
  expect(importModule).toHaveBeenCalledOnce();
});

it('does not reopen reading when the user leaves during its download', async () => {
  let finish;
  const importer = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { reading, instance } = fixture(importer);
  reading.open('reading');
  await settle();
  reading.hide();
  finish({ createReading: () => instance });
  await settle();
  expect(instance.open).not.toHaveBeenCalled();
  expect(document.querySelector('#reading-view').classList.contains('hidden')).toBe(true);
  expect(document.body.classList.contains('reading-active')).toBe(false);
});

it('offers recovery after a failed download', async () => {
  const { reading, importModule, retry } = fixture();
  importModule.mockRejectedValueOnce(new Error('offline'));
  reading.open('reading');
  await settle();
  expect(document.querySelector('[role="alert"]').textContent).toContain('nuk u ngarkua');
  document.querySelector('[data-reading-retry]').click();
  await settle();
  expect(retry).toHaveBeenCalledOnce();
  expect(importModule).toHaveBeenCalledOnce();
});

it('preserves a sidebar destination selected before its module finishes loading', async () => {
  const { instance } = fixture();
  document.querySelector('#reading-subnav [data-id="calendar"]').click();
  await settle();
  expect(instance.switchTab).toHaveBeenCalledWith('calendar');
});

it('prepares an existing desktop reading library before navigation without opening it', async () => {
  window.matchMedia = () => ({ matches: false });
  const { reading, instance, importModule } = fixture(undefined, [{ id: 'reading-demo' }]);
  await reading.refreshBackground();
  expect(importModule).toHaveBeenCalledOnce();
  expect(instance.prepare).toHaveBeenCalledTimes(2);
  expect(instance.open).not.toHaveBeenCalled();
  expect(document.querySelector('#reading-view').classList.contains('hidden')).toBe(true);
  reading.open('reading');
  expect(instance.open).toHaveBeenCalledWith('reading');
  expect(importModule).toHaveBeenCalledOnce();
});
