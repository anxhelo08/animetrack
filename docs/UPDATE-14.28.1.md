# AnimeTrack 14.28.1

Ky përditësim e bën ekranin bazë të telefonit një feed të orientuar nga historiku i shikimit dhe shkurton punën që ndodh kur ruhet progresi.

- Episodet e fundit shfaqen sipër, nga më i riu te më i vjetri. Çdo rresht historie ka veprimin “Vazhdo me …” për episodin pasues.
- Feed-i llogaritet një herë për llogari dhe revision të bibliotekës. Rreshtat e pandryshuar ruhen në DOM; HTML-ja e rreshtave të parë pastrohet në një kalim përmes ndihmës ekzistuese të sigurt.
- Pas ruajtjes së progresit, rekomandimet shënohen si të vjetruara dhe renditen kur seksioni kërkohet. Ruajtja nuk pret skanimin e katalogut të rekomandimeve.
- Shkurtoret e faqes bazë përshtaten në ekranin 320 px. Kërkimi dhe mjetet e Zbulo-s zënë më pak lartësi në telefon.
- Analiza e lexuar e kodit publik të Trakt dhe referencat e sakta të commit-eve janë te [shënimet e kërkimit](MOBILE-RESEARCH-2026-10-06.md). Nuk u shtua integrim Trakt apo host i ri në CSP.

## Verifikimi

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` dhe `npm run test:performance` kaluan. Testet e njësisë: 580. Testet iPhone Chromium: 9/9 për ndërfaqen mobile dhe 2/2 për rrugët dhe radhët me 500 tituj.

Matja laboratorike përdor 4× CPU slowdown dhe 500 tituj. Dy përsëritjet pas ndryshimit dhanë 3.6–4.0 s deri te renderimi fillestar, 517–598 ms kalim në Bibliotekë, 101–124 ms kthim te Kreu dhe 1.16–1.85 s reagim te episodi tjetër. Krahasimi i vetëm i mëparshëm ishte 3.19 s, 555 ms, 84 ms dhe 1.36 s përkatësisht. Nisja e parë dhe kthimi te Kreu dolën më ngadalë; kalimi në Bibliotekë ndryshoi sipas ekzekutimit, ndërsa reagimi i episodit pati interval të gjerë. Matjet nuk provojnë nisje më të shpejtë në iPhone real. Gzip i JavaScript-it është 340,757 B; limiti u rrit me 1,000 B për selector-in e cache-uar dhe rreshtat e qëndrueshëm të telefonit.

Nuk u ndryshua struktura e bibliotekës së ruajtur dhe nuk u testua Safari në iPhone fizik.
