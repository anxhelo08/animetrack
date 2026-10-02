# AnimeTrack

AnimeTrack 14.9.0 ndjek anime, seriale dhe filma, me bibliotekë personale dhe progres të sinkronizuar.

**[Hap aplikacionin](https://animetrack-flax.vercel.app/)** · [Ndryshimet](CHANGELOG.md) · [Siguria](SECURITY.md)

## Nisja lokale

Përdor Node 22 sipas `.nvmrc`, pastaj:

```sh
npm ci
npm run dev
```

`npm test` kontrollon tipat, testet unitare dhe build-in. Para publikimit ekzekuto edhe `npm run lint`, `npm run format:check`, `npm run audit` dhe `npm run test:performance`. Provat në shfletues: `npx playwright install chromium webkit`, `npm run test:e2e`.

## Përdorimi

Te Cilësimet mund të zgjedhësh temën, të eksportosh bibliotekën dhe të kontrollosh ruajtjen. Shënimi i një episodi ofron **Zhbëj** për 12 sekonda; zhbërja ndalet nëse ndryshon llogaria ose ngjarja e fundit. Në telefon, swipe djathtas në kartën e episodit shënon episodin; scroll-i vertikal mbetet i lirë dhe butoni është gjithmonë i disponueshëm.

Instalo aplikacionin nga Chrome/Edge ose Safari → Share → Add to Home Screen. PWA përfshin ikonë maskable, screenshots dhe shortcuts Biblioteka/Kërko/Aktiviteti në shfletuesit që i mbështesin. Shortcuts hapen pas identifikimit. Offline përdor kopjen e verifikuar pas një ngarkimi të mëparshëm; kërkimi online kërkon lidhje.

## Konfigurimi dhe publikimi

`.env.example` dokumenton vetëm sekretet e serverit dhe databazën lokale të provës. Mos i vendos sekretet në variabla `VITE_*`. Konfigurimi publik i klientit është te `src/config.js`; udhëzimet për serverin, databazën, IndexedDB, OAuth dhe push janë te [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Vercel krijon preview për branch/PR. Publikimi në `main` bëhet pas CI dhe verifikohet READY. CI kontrollon databazën, tre shfletues, buxhetin e JavaScript-it dhe medianën Lighthouse; raportet ruhen si artifacts.

[Prova me 3–5 përdorues realë](docs/USER-TESTING.md) është përgatitur por ende nuk është kryer. Testet automatike përdorin të dhëna sintetike dhe nuk zëvendësojnë këto prova.


### Anime News

Open **Zbulo → Anime News** on desktop or mobile, or find Anime News in the command palette. The section loads only when opened. `/api/news` reads Anime News Network RSS and tries Crunchyroll News if the first publisher fails; concurrent requests share a fetch. Successful responses use `s-maxage=900, stale-while-revalidate=1800`. A recently cached feed can cover a temporary publisher outage for up to 45 minutes and is labelled as cached; older data is rejected.

`renderNewsSection(containerElement)` in `src/modules/news.js` returns a controller with `refresh()`, `setActive(boolean)`, and `destroy()`. Call `setActive(false)` when hiding a retained container and `destroy()` when removing it permanently. Navigation preserves filters and card nodes. The featured headlines change every 20 seconds while visible, with prepared images and transitions that preserve the layout. Category labels group publisher categories or headline keywords. Reduced motion disables automatic headline changes, entrances, shimmer, hover movement and filter transitions.

When RSS omits a photo, `/api/news-image` resolves the image from that publisher's article page only when the image is needed. It redirects to the original photo rather than resizing it; the publisher determines the actual resolution. Article lookups have bounded downloads and redirects, share concurrent requests, and cache their result. Missing or temporarily unavailable artwork uses `public/news-placeholder.svg` without preventing articles from loading.

Vite development and preview serve the same news handlers as Vercel. RSS and article access require outbound HTTPS to `www.animenewsnetwork.com` and `www.crunchyroll.com`; publisher failures show a retry state rather than sample articles. Run `npx vitest run tests/unit/news-api.test.js tests/unit/news-photo.test.js tests/unit/news.test.js` and `npx playwright test tests/e2e/news.spec.js` to verify parsing, caching, photo resolution and browser interactions.
