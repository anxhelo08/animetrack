// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createKeyedRows } from '../../src/core/keyed-rows.js';
import { createHTML } from '../../src/modules/safe-html.js';

let root, html, renderHTML, renderer;
beforeEach(() => {
  document.body.innerHTML = '<div id="rows"></div>';
  root = document.getElementById('rows');
  const safeHtml = createHTML(window);
  renderHTML = vi.fn(safeHtml.renderHTML);
  html = { renderHTML };
  renderer = createKeyedRows({ root, html });
});

const row = (key, title) => ({
  key,
  markup: `<article data-row="${key}"><button type="button">${title}</button></article>`,
});

test('unchanged rows retain their nodes and the user focus across a reorder', () => {
  renderer.render([row('one', 'First'), row('two', 'Second')]);
  const first = root.querySelector('[data-row="one"]');
  const second = root.querySelector('[data-row="two"]');
  second.querySelector('button').focus();

  renderer.render([row('two', 'Second'), row('one', 'First')]);

  expect([...root.children]).toEqual([second, first]);
  expect(document.activeElement).toBe(second.querySelector('button'));
  expect(renderHTML).toHaveBeenCalledOnce();
});

test('changed rows replace only their own node and removed or duplicate keys leave no duplicate DOM', () => {
  renderer.render([row('one', 'First'), row('two', 'Second')]);
  const first = root.querySelector('[data-row="one"]');

  renderer.render([row('one', 'First updated'), row('one', 'Duplicate'), row('three', 'Third')]);

  expect(root.querySelector('[data-row="one"]')).not.toBe(first);
  expect(root.querySelector('[data-row="one"]').textContent).toBe('First updated');
  expect(root.querySelectorAll('[data-row="one"]')).toHaveLength(1);
  expect(root.querySelector('[data-row="two"]')).toBeNull();
  expect(root.querySelectorAll('[data-row="three"]')).toHaveLength(1);
});

test('reset removes retained rows and rebuilds the requested collection', () => {
  renderer.render([row('one', 'First')]);
  renderer.reset();
  expect(root.childElementCount).toBe(0);
  renderer.render([row('one', 'First')]);
  expect(root.textContent).toBe('First');
});

test('non-row markup is ignored without inserting multiple sanitized roots', () => {
  renderer.render([{ key: 'bad', markup: '<span>first</span><span>second</span>' }]);
  expect(root.childElementCount).toBe(0);
});
