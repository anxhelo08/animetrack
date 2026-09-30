import { test, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mountReleaseExperience } from '../../src/modules/release-experience.js';

function fixture(run) {
  const dom = new JSDOM('<body></body>', {
    url: 'https://example.test/?source=pwa&shortcut=library',
  });
  const previous = {};
  for (const key of ['window', 'document', 'location', 'history']) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  vi.useFakeTimers();
  try {
    run(dom.window);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    dom.window.close();
    for (const key of Object.keys(previous)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else delete globalThis[key];
    }
  }
}

test('an undo offered by one account cannot remove an episode after the account changes', () =>
  fixture(() => {
    let owner = 'account-a';
    const undo = vi.fn(() => true);
    const experience = mountReleaseExperience({
      owner: () => owner,
      history: () => ({ eventId: 'same-event' }),
      undo,
    });
    experience.episodeSaved({ id: 'anime', seasonId: 'season', n: 1, seen: true });
    owner = 'account-b';
    document.querySelector('.release-feedback button').click();
    expect(undo).not.toHaveBeenCalled();
    expect(document.querySelector('.release-feedback').textContent).toContain(
      'Progresi ka ndryshuar',
    );
  }));

test('a shortcut survives sign-in and is consumed once after authentication', () =>
  fixture(() => {
    let owner = 'guest';
    const navigate = vi.fn();
    const experience = mountReleaseExperience({ owner: () => owner, navigate });
    experience.ready();
    expect(navigate).not.toHaveBeenCalled();
    expect(new URL(location.href).searchParams.get('shortcut')).toBe('library');
    owner = 'account-a';
    experience.ready();
    experience.ready();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('library');
    expect(new URL(location.href).searchParams.get('source')).toBe('pwa');
    expect(new URL(location.href).searchParams.has('shortcut')).toBe(false);
  }));
