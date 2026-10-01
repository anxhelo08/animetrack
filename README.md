# AnimeTrack

AnimeTrack 14.6.1 ndjek anime, seriale dhe filma, me bibliotekë personale dhe progres të sinkronizuar.

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
