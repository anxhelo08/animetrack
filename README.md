# AnimeTrack 10.1 — Anime Universe Pro

Aplikacion personal për ndjekjen e animeve, episodeve dhe filmave, me llogari dhe bibliotekë cloud.

**Faqja:** https://animetrack-flax.vercel.app  
**Deploy:** Vercel automatikisht nga `main` në `anxhelo08/animetrack`.

## Funksionet
- Bibliotekë për çdo përdorues, sezone të grupuara, progres sipas episodeve të transmetuara dhe rewatch i ndarë.
- AniList / Jikan / TVmaze për metadata, përshkrime dhe foto episodeve kur burimet i ofrojnë.
- Inbox i organizuar sipas kategorive, lexo/fsheh/çaktivizo llojin, kujtesa kalendari, episode, sezone, komente dhe miq.
- Discovery 10.0: rekomandime nga notat/zhanret/favorites, filtra sipas humorit dhe gjatësisë, perla nën radar, filma, surpriza, arsyetim i sugjerimit dhe fshehje për çdo llogari.
- Kalendar javë/muaj/timeline, filtra personalë, episode të paregjistruara, kujtesa in-app dhe eksport .ics; Wrapped me eksport PNG.
- Profile me header personal, 12-javë heatmap, top anime, zhanre, rewatch dhe badges; privatesi me zgjedhje te përdoruesit, kërkesa miqësie dhe krahasim bibliotekash.
- Panel moderimi vetëm për llogarinë e autorizuar.
- PWA e instalueshme kur shfletuesi e mbështet. Funksionet cloud kërkojnë lidhje interneti.

**Njoftimet janë in-app**, jo push në sfond kur faqja është e mbyllur. Orari i një episodi tregon transmetimin e njoftuar, jo garanci për disponueshmërinë në një platformë streaming.

## Arkitektura
`index.html`: struktura e faqes dhe ngarkimi i moduleve.  
`assets/app.js` / `assets/app.css`: aplikacioni ekzistues, i nxjerrë nga skedari monolitik pa ndryshuar përmbajtjen.  
`assets/pro-*.js` / `assets/pro-features.css` / `assets/pro-visual-101.css`: funksionet e reja si module të pavarura.  
`manifest.webmanifest`, `sw.js`, `icon.svg`: instalimi dhe cache-i i skeletit të faqes.  
`tests/pro-smoke.test.cjs`: prova të moduleve, strukturës dhe sintaksës.

Për testet lokale: `npm test` (Node 20+; nuk ka varësi npm).

## Ruajtja dhe siguria
Supabase Auth dhe RLS ndajnë bibliotekat personale. Profili nis privat; lista e përmbledhur ndahet publikisht vetëm pas aktivizimit nga përdoruesi ose me miqësinë e pranuar. Komentet dhe raportimet ruhen në tabela të veçanta. Në HTML ka vetëm publishable key; **mos vendos kurrë service-role/secret key në repo**.

Deploy i kodit nuk duhet të fshijë bibliotekat; për siguri eksporto periodikisht kopje rezervë.
