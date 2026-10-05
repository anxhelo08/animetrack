// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createDecisionDialog } from '../../src/modules/decision-dialog.js';
import { createHTML } from '../../src/modules/safe-html.js';
test('confirmations escape text, cancel safely and resolve in order without native window dialogs', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (value) {
    this.returnValue = value;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  const native = vi.spyOn(window, 'confirm'),
    confirm = createDecisionDialog(createHTML(window));
  const first = confirm('<img src=x onerror=alert(1)>'),
    second = confirm('Hiq titullin?');
  await Promise.resolve();
  const dialog = document.querySelector('dialog');
  expect(dialog.querySelector('img')).toBe(null);
  expect(dialog.textContent).toContain('<img');
  dialog.querySelector('[data-decision="cancel"]').click();
  expect(await first).toBe(false);
  await Promise.resolve();
  document.querySelector('[data-decision="accept"]').click();
  expect(await second).toBe(true);
  expect(document.querySelector('dialog')).toBe(null);
  expect(native).not.toHaveBeenCalled();
  native.mockRestore();
});
