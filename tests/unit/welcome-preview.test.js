import { test, expect } from 'vitest';
import { canPreviewWelcome } from '../../src/modules/welcome-preview.js';

const url = 'https://project.supabase.co';
const location = { hash: '', search: '' };
test('new visitors can see welcome before the full controller initializes', () => {
  expect(canPreviewWelcome({ getItem: () => null }, url, location)).toBe(true);
});
test('stored sessions, OAuth returns and inaccessible storage wait for verified auth', () => {
  expect(
    canPreviewWelcome(
      { getItem: (key) => (key === 'sb-project-auth-token' ? 'session' : null) },
      url,
      location,
    ),
  ).toBe(false);
  for (const query of ['?code=callback', '#access_token=token', '?error=denied', '#type=recovery'])
    expect(canPreviewWelcome({ getItem: () => null }, url, { hash: query, search: '' })).toBe(
      false,
    );
  expect(
    canPreviewWelcome(
      {
        getItem: () => {
          throw Error('blocked');
        },
      },
      url,
      location,
    ),
  ).toBe(false);
});
