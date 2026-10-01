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

test('episode rating cannot edit the previous account and missing release dates are disabled', () =>
  fixture(() => {
    let owner = 'account-a';
    const journal = vi.fn(() => ({
      title: 'Episode',
      date: '2026-09-29T12:00:00Z',
      rating: null,
      releaseDate: null,
    }));
    const experience = mountReleaseExperience({
      owner: () => owner,
      history: () => ({ eventId: 'watched-event' }),
      journal,
    });
    experience.episodeSaved({ id: 'anime', seasonId: 'season', n: 1, seen: true });
    expect(
      [...document.querySelectorAll('.release-dates button')].find(
        (x) => x.textContent === 'Kur doli',
      ).disabled,
    ).toBe(true);
    journal.mockClear();
    owner = 'account-b';
    document.querySelector('[data-rating="4"]').click();
    expect(journal).not.toHaveBeenCalled();
  }));

test('a rejected rating save retains the existing rating and reports failure', () =>
  fixture(() => {
    const journal = vi.fn((_entry, changes) =>
      changes
        ? null
        : { title: 'Episode', date: '2026-09-29T12:00:00Z', rating: 6, releaseDate: null },
    );
    const experience = mountReleaseExperience({
      owner: () => 'account-a',
      history: () => ({ eventId: 'watched-event' }),
      journal,
    });
    experience.episodeSaved({ id: 'anime', seasonId: 'season', n: 1, seen: true });
    document.querySelector('[data-rating="5"]').click();
    expect(document.querySelector('[data-rating="3"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-rating="5"]').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('.release-journal').textContent).toContain('Nuk u ruajt');
  }));

test('successful marking opens the episode and keeps date controls bound across card renders', () =>
  fixture(() => {
    const openEpisode = vi.fn();
    const experience = mountReleaseExperience({
      owner: () => 'account-a',
      history: () => ({ eventId: 'watched-event' }),
      journal: () => ({
        title: 'Episode',
        date: '2026-09-29T12:00:00Z',
        rating: null,
        releaseDate: null,
      }),
      openEpisode,
    });
    const entry = { id: 'anime', seasonId: 'season', n: 2, seen: true };
    experience.episodeSaved(entry);
    expect(openEpisode).toHaveBeenCalledExactlyOnceWith(entry);
    const card = document.createElement('section');
    card.className = 'episode-card';
    card.innerHTML = '<div class="episode-card-watch"></div>';
    document.body.append(card);
    experience.attach(card, { a: { id: 'anime' }, s: { id: 'season' }, n: 2 });
    expect(card.querySelector('.release-journal')).not.toBeNull();
    experience.attach(card, { a: { id: 'anime' }, s: { id: 'season' }, n: 3 });
    expect(card.querySelector('.release-journal')).toBeNull();
    expect(document.querySelector('.release-feedback').hidden).toBe(true);
    experience.episodeSaved({ ...entry, seen: false });
    expect(openEpisode).toHaveBeenCalledTimes(1);
  }));
