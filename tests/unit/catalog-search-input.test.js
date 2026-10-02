// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { protectCatalogSearchInputs } from '../../src/modules/catalog-search-input.js';

beforeEach(() => {
  document.body.innerHTML =
    '<input id="season-search"><input id="account-password" type="password">';
});
it('isolates title searches from login fields and suppresses saved-email autofill before it reaches search', () => {
  const input = document.querySelector('#season-search'),
    search = vi.fn();
  protectCatalogSearchInputs([input], () => 'owner@example.com');
  input.addEventListener('input', () => search(input.value));
  input.value = 'OWNER@example.com';
  input.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }),
  );
  expect(input.value).toBe('');
  expect(search.mock.calls).toEqual([['']]);
  expect(input.form.autocomplete).toBe('off');
  expect(input.form.querySelector('[type="password"]')).toBeNull();
  expect(input.type).toBe('search');
  expect(document.querySelector('#account-password').value).toBe('');
});
it('keeps deliberate typing and pasting intact and reads the current account instead of a stale email', () => {
  const input = document.querySelector('#season-search');
  let email = 'old@example.com';
  protectCatalogSearchInputs([input], () => email);
  input.value = 'Attack on Titan';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  expect(input.value).toBe('Attack on Titan');
  email = 'new@example.com';
  input.value = email;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  expect(input.value).toBe('');
  input.value = email;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  expect(input.value).toBe(email);
});

it('clears autofill already present before the account becomes known', () => {
  const input = document.querySelector('#season-search');
  let email = null;
  input.value = 'owner@example.com';
  const recheck = protectCatalogSearchInputs([input], () => email);
  recheck();
  expect(input.value).toBe('owner@example.com');
  email = 'owner@example.com';
  recheck();
  expect(input.value).toBe('');
});
