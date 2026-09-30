// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { delegateButtons } from '../../src/core/ui-events.js';

test('nested SVG clicks reach one action, disabled controls do not, cleanup stops the router', () => {
  const root = document.createElement('div');
  root.innerHTML =
    '<button data-next="a"><svg><path></path></svg></button><button disabled><span>Disabled</span></button>';
  document.body.append(root);
  const called = [];
  const stop = delegateButtons(root, (button) => called.push(button.dataset.next));
  root.querySelector('path').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  root.querySelector('span').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(called).toEqual(['a']);
  stop();
  root.querySelector('button').click();
  expect(called).toHaveLength(1);
  root.remove();
});
