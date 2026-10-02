import { describe, it, expect, vi } from 'vitest';
import {
  newsArticleURL,
  newsImageEndpoint,
  parseNewsPhoto,
  createNewsPhotoResolver,
} from '../../server/news-photo.js';
import { createHandler } from '../../api/news-image.js';

const article = 'https://www.animenewsnetwork.com/news/2026-10-02/new-anime/.242403';
const image = 'https://www.animenewsnetwork.com/images/cms/news.7/anime.jpg';
const html = (body) =>
  new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
const page = `<meta property="og:image" content="${image}">`;
const request = { method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
const response = () => ({
  headers: {},
  code: null,
  body: null,
  setHeader(key, value) {
    this.headers[key] = value;
  },
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  },
});

describe('publisher photo parsing', () => {
  it('accepts only approved HTTPS publisher news pages, not arbitrary URLs or credentials', () => {
    expect(newsArticleURL(article + '#discussion')).toBe(article);
    expect(newsImageEndpoint(article)).toBe(
      '/api/news-image?article=' + encodeURIComponent(article),
    );
    for (const bad of [
      'https://evil.example/news/1',
      'https://www.animenewsnetwork.com.evil.example/news/1',
      'https://www.animenewsnetwork.com:8443/news/1',
      'https://secret@www.animenewsnetwork.com/news/1',
      'http://www.animenewsnetwork.com/news/1',
      'https://www.animenewsnetwork.com/admin',
      'https://www.animenewsnetwork.com/news/rss.xml',
      'https://127.0.0.1/news/1',
      ['https://www.animenewsnetwork.com/news/1'],
    ])
      expect(newsArticleURL(bad)).toBe('');
  });
  it('reads secure OG/Twitter metadata regardless of attribute order and decodes URL entities', () => {
    expect(
      parseNewsPhoto(
        `<meta content='https://cdn.animenewsnetwork.com/photo.jpg?crop=wide&amp;size=original' property='og:image:secure_url'>`,
        article,
      ),
    ).toBe('https://cdn.animenewsnetwork.com/photo.jpg?crop=wide&size=original');
    expect(parseNewsPhoto(`<meta content="/images/anime.jpg" name="twitter:image">`, article)).toBe(
      'https://www.animenewsnetwork.com/images/anime.jpg',
    );
    expect(
      parseNewsPhoto(
        '<meta property="og:image" content="https://a.storyblok.com/f/178900/photo.jpg">',
        'https://www.crunchyroll.com/news/latest/anime',
      ),
    ).toBe('https://a.storyblok.com/f/178900/photo.jpg');
    expect(
      parseNewsPhoto(
        `<meta property="og:image" content="/images/small.jpg"><meta property="og:image:width" content="300"><meta property="og:image" content="${image}"><meta property="og:image:width" content="2000">`,
        article,
      ),
    ).toBe(image);
  });
  it('prefers a publisher-linked full original or highest declared srcset rather than guessing a 4K URL', () => {
    const thumbnail =
      'https://www.animenewsnetwork.com/thumbnails/crop600x315/cms/news.7/anime.jpg';
    expect(
      parseNewsPhoto(
        `<meta property="og:image" content="${thumbnail}"><a href="${image}"><img src="${thumbnail}"></a>`,
        article,
      ),
    ).toBe(image);
    expect(
      parseNewsPhoto(
        `<meta property="og:image" content="${thumbnail}"><img srcset="/thumbnails/w800/anime.jpg 800w, /images/original/anime.jpg 1600w">`,
        article,
      ),
    ).toBe('https://www.animenewsnetwork.com/images/original/anime.jpg');
  });
  it('finds ordinary full original img sources beyond a preceding unrelated article widget', () => {
    const thumbnail =
      'https://www.animenewsnetwork.com/thumbnails/crop600x315gHD/cms/news.7/anime.jpg';
    for (const attribute of ['src', 'data-src']) {
      expect(
        parseNewsPhoto(
          `<meta property="og:image" content="${thumbnail}"><article class="widget"><img src="/images/unrelated.jpg"></article><div class="meat"><img ${attribute}="${image}" width="2000"></div>`,
          article,
        ),
      ).toBe(image);
    }
    expect(
      parseNewsPhoto(
        `<meta property="og:image" content="${thumbnail}"><article>Widget</article><div class="meat"><a href="${image}"><img src="${thumbnail}" srcset="/thumbnails/w1600/anime.jpg 1600w"></a></div>`,
        article,
      ),
    ).toBe(image);
    expect(
      parseNewsPhoto(
        `<meta property="og:image" content="${thumbnail}"><img src="/images/unrelated.jpg"><img src="${thumbnail}">`,
        article,
      ),
    ).toBe(thumbnail);
  });
  it('ignores scripts, comments, logos, unsafe destinations, and unrelated outside-body pictures', () => {
    expect(
      parseNewsPhoto(
        `<script>${page}</script><!--${page}--><img src="${image}"><meta property="og:image" content="https://evil.example/photo.jpg"><meta property="og:image" content="/logo.png">`,
        article,
      ),
    ).toBe('');
    expect(
      parseNewsPhoto(`<ARTICLE><p>No article image.</p></ARTICLE><img src="${image}">`, article),
    ).toBe('');
    expect(
      parseNewsPhoto(
        `<img src="/header.jpg"><div class="meat"><img width="50" src="/tiny.jpg"><img width="1000" src="${image}"></div>`,
        article,
      ),
    ).toBe(image);
    expect(
      parseNewsPhoto(
        `<div class="meat"><p>Article without a photo.</p></div><img src="${image}">`,
        article,
      ),
    ).toBe('');
    for (const bad of [
      'javascript:alert(1)',
      'http://127.0.0.1/a.jpg',
      'https://user@www.animenewsnetwork.com/a.jpg',
    ])
      expect(parseNewsPhoto(`<meta property="og:image" content="${bad}">`, article)).toBe('');
  });
  it('uses explicit NewsArticle JSON metadata when social images are absent, rejecting unrelated schema logos', () => {
    expect(
      parseNewsPhoto(
        `<script type="application/ld+json">{"@graph":[{"@type":"Organization","image":"https://www.animenewsnetwork.com/brand.jpg"},{"@type":"NewsArticle","image":{"contentUrl":"${image}","width":2400}}]}</script>`,
        article,
      ),
    ).toBe(image);
  });
});

describe('bounded lazy photo resolution', () => {
  it('collapses concurrent article requests, caches real photos for a day, and shares the same redirect timeout', async () => {
    let now = 0;
    const fetchImpl = vi.fn(async (target) =>
      target === article
        ? new Response('', { status: 302, headers: { location: article + '?edition=us' } })
        : html(page),
    );
    const resolve = createNewsPhotoResolver({ fetchImpl, clock: () => now });
    const results = await Promise.all([resolve(article), resolve(article), resolve(article)]);
    expect(results).toEqual(Array(3).fill({ image, status: 'resolved', ttl: 86400 }));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1].signal).toBe(fetchImpl.mock.calls[1][1].signal);
    now = 86399999;
    await resolve(article);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    now = 86400001;
    await resolve(article);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
  it('only briefly caches denials and reattempts a real photo after a minute', async () => {
    let now = 0;
    let denied = true;
    const fetchImpl = vi.fn(async () =>
      denied ? new Response('Forbidden', { status: 403 }) : html(page),
    );
    const resolve = createNewsPhotoResolver({ fetchImpl, clock: () => now });
    expect(await resolve(article)).toEqual({ image: '', status: 'unavailable', ttl: 60 });
    denied = false;
    now = 59999;
    expect((await resolve(article)).image).toBe('');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now = 60001;
    expect((await resolve(article)).image).toBe(image);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('blocks cross-publisher/private/insecure redirects and caps redirect loops/body bytes', async () => {
    for (const location of [
      'http://www.animenewsnetwork.com/news/1',
      'https://www.crunchyroll.com/news/1',
      'https://www.animenewsnetwork.com:8443/news/1',
      'https://127.0.0.1/news/1',
    ]) {
      const fetchImpl = vi.fn(async () => new Response('', { status: 302, headers: { location } }));
      expect((await createNewsPhotoResolver({ fetchImpl })(article)).image).toBe('');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
    const loop = vi.fn(
      async () => new Response('', { status: 302, headers: { location: article } }),
    );
    expect((await createNewsPhotoResolver({ fetchImpl: loop })(article)).image).toBe('');
    expect(loop).toHaveBeenCalledTimes(3);
    const huge = vi.fn(async () => html('x'.repeat(1000001)));
    expect((await createNewsPhotoResolver({ fetchImpl: huge })(article)).image).toBe('');
  });
  it('queues ordinary 40-photo bursts while limiting simultaneous publisher fetches to eight', async () => {
    const releases = [];
    const fetchImpl = vi.fn(
      () => new Promise((resolve) => releases.push(() => resolve(html(page)))),
    );
    const resolve = createNewsPhotoResolver({ fetchImpl });
    const first = Array.from({ length: 40 }, (_, i) => resolve(article + '?page=' + i));
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(8);
    for (let batch = 0; batch < 5; batch++) {
      const current = releases.splice(0, 8);
      current.forEach((release) => release());
      await vi.waitFor(() =>
        expect(fetchImpl).toHaveBeenCalledTimes(Math.min(40, (batch + 2) * 8)),
      );
    }
    expect((await Promise.all(first)).every((photo) => photo.image === image)).toBe(true);
  });
});

describe('public photo endpoint', () => {
  it('redirects to a genuine source photo with a long success TTL and supports the local URL query adapter', async () => {
    const resolve = vi.fn(async () => ({ image, status: 'resolved', ttl: 86400 }));
    const res = response();
    await createHandler({ resolve, limit: () => true })(
      { ...request, url: newsImageEndpoint(article) },
      res,
    );
    expect(resolve).toHaveBeenCalledWith(article);
    expect(res.code).toBe(302);
    expect(res.headers.Location).toBe(image);
    expect(res.headers['Cache-Control']).toBe('public, max-age=86400, s-maxage=86400');
    expect(res.ended).toBe(true);
  });
  it('uses the local placeholder and short cache on unavailable photos, without discarding the article', async () => {
    const res = response();
    await createHandler({
      resolve: async () => ({ image: '', status: 'unavailable', ttl: 60 }),
      limit: () => true,
    })({ ...request, query: { article } }, res);
    expect(res.code).toBe(302);
    expect(res.headers.Location).toBe('/news-placeholder.svg');
    expect(res.headers['Cache-Control']).toBe('public, max-age=60, s-maxage=60');
  });
  it('rejects unsupported methods, invalid URLs and rate-limited clients before publisher work', async () => {
    const resolve = vi.fn();
    const handler = createHandler({ resolve, limit: () => true });
    for (const query of [{ article: 'https://127.0.0.1/news/1' }, { article: [article] }, {}]) {
      const res = response();
      await handler({ ...request, query }, res);
      expect(res.code).toBe(400);
    }
    const method = response();
    await handler({ ...request, method: 'POST' }, method);
    expect(method.code).toBe(405);
    const rate = response();
    await createHandler({ resolve, limit: () => false })(request, rate);
    expect(rate.code).toBe(429);
    expect(resolve).not.toHaveBeenCalled();
  });
});
