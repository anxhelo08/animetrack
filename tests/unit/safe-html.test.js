// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { createHTML, percentClass, setPercent } from '../../src/modules/safe-html.js';
import { safeAvatarURL } from '../../src/modules/avatar.js';
import { cloudConfig } from '../../src/config.js';
import '../../src/modules/security.js';

const ui = createHTML(window);
const payloads = [
  '<img src=x onerror="alert(1)">',
  '"><svg onload="alert(1)">',
  '</textarea><script>alert(1)</script>',
  '<a href="javascript:alert(1)">click</a>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',
];

describe('one HTML boundary', () => {
  test.each(payloads)('interpolation remains literal text: %s', (payload) => {
    const node = document.createElement('div');
    ui.renderHTML(node, ui.html`<button data-title="${payload}">${payload}</button>`);
    expect(node.querySelector('button').textContent).toBe(payload);
    // DOMPurify may drop suspicious attributes; visible text must still be literal.
    expect([undefined, payload]).toContain(node.querySelector('button').dataset.title);
    expect(node.querySelector('img, svg, script, a, math')).toBeNull();
  });

  test('decoded external text cannot become active markup', () => {
    const decoded = window.ATSecurity136.text('&lt;img src=x onerror=alert(1)&gt;');
    expect(decoded).toContain('<img');
    const node = document.createElement('div');
    ui.renderHTML(node, ui.html`<p>${decoded}</p>`);
    expect(node.querySelector('p').textContent).toBe(decoded);
    expect(node.querySelector('img')).toBeNull();
  });

  test.each(payloads)('legacy markup is sanitized at insertion: %s', (payload) => {
    const node = document.createElement('div');
    ui.renderHTML(node, payload);
    for (const element of node.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on|^style$|^srcdoc$/i);
        expect(attribute.value).not.toMatch(/^javascript:/i);
      }
    }
    expect(node.querySelector('script, iframe, object, embed, style')).toBeNull();
  });

  test('nested fragments preserve controls, SVG, aria and delegated actions', () => {
    const node = document.createElement('div');
    const button = ui.html`<button type="button" data-id="${'a&b'}" aria-label="Hap">Hap</button>`;
    ui.renderHTML(
      node,
      ui.html`<form id="profile-edit"><input id="name" value="${'A & B'}">${[button]}<svg viewBox="0 0 24 24"><path d="M0 0h4"></path></svg></form>`,
    );
    expect(node.querySelector('input').value).toBe('A & B');
    expect(node.querySelector('button').dataset.id).toBe('a&b');
    expect(node.querySelector('button').getAttribute('aria-label')).toBe('Hap');
    expect(node.querySelector('svg path')).not.toBeNull();
    ui.insertHTML(node, 'beforeend', '<p style="color:red" onclick="alert(1)">More</p>');
    expect(node.lastElementChild.outerHTML).toBe('<p>More</p>');
    ui.replaceHTML(node.lastElementChild, '<b onmouseover="alert(1)">Changed</b>');
    expect(node.lastElementChild.outerHTML).toBe('<b>Changed</b>');
  });

  test('forged fragment-like objects and raw HTML bridges are not trusted', () => {
    const node = document.createElement('div');
    ui.renderHTML(node, ui.html`<p>${{ toString: () => '<img src=x onerror=alert(1)>' }}</p>`);
    expect(node.querySelector('img')).toBeNull();
    ui.renderHTML(node, ui.html`${ui.markup('<b onclick="alert(1)">ok</b>')}`);
    expect(node.innerHTML).toBe('<b>ok</b>');
    expect(() => ui.html(['<b>raw</b>'])).toThrow(TypeError);
  });
});

test('progress classes clamp malformed values and replace stale classes', () => {
  expect(percentClass(12.6)).toBe('at-percent-w-13');
  expect(percentClass(-4)).toBe('at-percent-w-0');
  expect(percentClass(100000)).toBe('at-percent-w-100');
  expect(percentClass('0; background:url(https://evil.test)')).toBe('at-percent-w-0');
  const node = document.createElement('span');
  node.className = 'progress at-percent-w-3';
  setPercent(node, 47);
  expect(node.className).toBe('progress at-percent-w-47');
  expect(node.hasAttribute('style')).toBe(false);
});

test('avatars allow only this project Storage objects', () => {
  const own = cloudConfig.url + '/storage/v1/object/public/avatars/photo.png';
  expect(safeAvatarURL(own)).toBe(own);
  for (const value of [
    'https://tracker.test/me.png',
    cloudConfig.url + '.evil.test/storage/v1/object/public/a/b',
    'data:image/svg+xml,x',
    'javascript:alert(1)',
    cloudConfig.url + '/functions/v1/redirect',
    cloudConfig.url.replace('https:', 'http:') + '/storage/v1/object/public/a/b',
    cloudConfig.url.replace('https://', 'https://user:pass@') + '/storage/v1/object/public/a/b',
  ]) {
    expect(safeAvatarURL(value)).toBe('');
  }
});

test('public cloud configuration is immutable and ignores localStorage', () => {
  localStorage.setItem(
    'animetrack_cloud_config_v1',
    JSON.stringify({ url: 'https://evil.test', key: 'fake' }),
  );
  expect(Object.isFrozen(cloudConfig)).toBe(true);
  expect(window.ANIMETRACK_CONFIG).toBe(cloudConfig);
  expect(() => {
    cloudConfig.url = 'https://evil.test';
  }).toThrow();
  expect(() => {
    window.ANIMETRACK_CONFIG = {};
  }).toThrow();
});
