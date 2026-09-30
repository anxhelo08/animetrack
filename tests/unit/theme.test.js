import { expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { createTheme, THEME_KEY } from '../../src/core/theme.js';
import { designSystemCSS } from '../../src/design-system.mjs';

function fixture(saved) {
  const page = new JSDOM('<meta name="theme-color"><meta name="color-scheme">').window.document;
  const data = new Map(saved === undefined ? [] : [[THEME_KEY, saved]]);
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  const media = new EventTarget();
  media.matches = false;
  return { page, storage, media, data };
}
test('theme preserves the dark default, stores device preference and follows system only in auto', () => {
  const f = fixture();
  const theme = createTheme({ ...f, document: f.page });
  expect(f.page.documentElement.dataset.theme).toBe('dark');
  theme.set('auto');
  expect(f.page.documentElement.dataset.theme).toBe('light');
  expect(f.page.querySelector('meta[name="theme-color"]').content).toBe('#f4f5fa');
  f.media.matches = true;
  f.media.dispatchEvent(new Event('change'));
  expect(f.page.documentElement.dataset.theme).toBe('dark');
  theme.set('light');
  f.media.dispatchEvent(new Event('change'));
  expect(f.page.documentElement.dataset.theme).toBe('light');
  expect(f.data.get(THEME_KEY)).toBe('light');
  expect(f.data.size).toBe(1);
  theme.dispose();
});
test('invalid values and unavailable storage leave the current preference intact', () => {
  const f = fixture('invalid');
  const theme = createTheme({ ...f, document: f.page });
  expect(theme.get()).toBe('dark');
  expect(theme.set('invalid')).toBe(false);
  f.storage.setItem = () => {
    throw Error('quota');
  };
  expect(theme.set('light')).toBe(false);
  expect(theme.get()).toBe('dark');
  expect(f.page.documentElement.dataset.theme).toBe('dark');
});
test('CSS compiler preserves dark literals, scopes light colors, groups layers and limits blur', async () => {
  const input =
    '.card{background:#171824;color:#f0f0fa;color:#f0f0fa;border:1px solid #303148;backdrop-filter:blur(18px)}.at-mobile-nav{z-index:1000}.primary{background:#7654e7;color:white}@media(max-width:980px){.card{padding:2px}}';
  const result = await postcss([designSystemCSS()]).process(input, { from: undefined });
  expect(result.css).toContain('light-dark(var(--surface),#171824)');
  expect(result.css).toContain('light-dark(var(--text),#f0f0fa)');
  expect(result.css.match(/color:light-dark/g)).toHaveLength(1);
  expect(result.css).toContain('z-index:var(--layer-navigation)');
  expect(result.css).toContain('blur(8px)');
  expect(result.css).toContain('.primary{background:#7654e7;color:white}');
  expect(result.css).toContain('max-width:1000px');
});
