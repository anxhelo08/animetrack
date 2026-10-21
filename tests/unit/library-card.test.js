// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createLibraryCard } from '../../src/modules/library-card.js';
import { createHTML } from '../../src/modules/safe-html.js';
for (const phone of [false, true])
  test(`library card retains its actions and computes shared values once (${phone ? 'phone' : 'desktop'})`, () => {
    const html = createHTML(window),
      d = {
        releasedCount: (s) => s.total,
        validPoster: () => '/welcome/demon-slayer.jpg',
        mediaKind: () => 'anime',
        STATUS: { watching: 'Po shikoj' },
        count: vi.fn(() => 1),
        releasedTotal: vi.fn(() => 12),
        percentage: vi.fn(() => 8),
        nextSeasonEp: () => ({ n: 2 }),
        hasNewUnwatchedEpisode: () => false,
        cover: () => '<img class="poster" src="/welcome/demon-slayer.jpg" alt="">',
        escapeHTML: html.escapeHTML,
        phone: () => phone,
        releaseYear: () => 2020,
        percentClass: (n) => html.percentClass(n, 'w'),
      };
    d.escapeHTML = (value) =>
      String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
    const row = {
      id: 'card-id',
      title: '<img onerror="alert(1)">',
      status: 'watching',
      cover: '/welcome/demon-slayer.jpg',
      seasons: [{ total: 12, watched: [1], format: 'TV', releaseStatus: 'FINISHED' }],
    };
    const root = document.createElement('div');
    html.renderHTML(root, createLibraryCard(d)(row));
    expect(root.textContent).toContain(row.title);
    expect(root.querySelector('[data-detail]').dataset.detail).toBe(row.id);
    expect(root.querySelector('[data-next]').dataset.next).toBe(row.id);
    expect(root.querySelector('[onerror]')).toBeNull();
    expect(d.count).toHaveBeenCalledTimes(1);
    expect(d.releasedTotal).toHaveBeenCalledTimes(1);
    expect(d.percentage).toHaveBeenCalledTimes(1);
  });
