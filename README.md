# AnimeTrack 10.5.1 — Anime Universe Pro

Aplikacion personal për ndjekjen e animeve, episodeve dhe filmave, me llogari dhe bibliotekë cloud.

**Faqja:** https://animetrack-flax.vercel.app  
**Deploy:** Vercel automatikisht nga `main` në `anxhelo08/animetrack`.

## Funksionet
- Bibliotekë për çdo përdorues, sezone të grupuara, progres sipas episodeve të transmetuara dhe rewatch i ndarë.
- AniList / Jikan / TVmaze për metadata, përshkrime dhe foto episodeve kur burimet i ofrojnë.
- Inbox i organizuar sipas kategorive, lexo/fsheh/çaktivizo llojin, kujtesa kalendari, episode, sezone, komente dhe miq.
- Discovery: rekomandime nga notat/zhanret/favorites, filtra sipas humorit dhe gjatësisë, perla nën radar, filma, surpriza, arsyetim i sugjerimit dhe fshehje për çdo llogari.
- Kalendar javë/muaj/timeline, filtra personalë, episode të paregjistruara, kujtesa in-app dhe eksport .ics; Wrapped me eksport PNG.
- Profile me header personal, 12-javë heatmap, top anime, zhanre, rewatch dhe badges; privatesi me zgjedhje te përdoruesit, kërkesa miqësie dhe krahasim bibliotekash.
- Panel moderimi vetëm për llogarinë e autorizuar.
- PWA e instalueshme kur shfletuesi e mbështet. Funksionet cloud kërkojnë lidhje interneti.

**Njoftimet janë in-app**, jo push në sfond kur faqja është e mbyllur. Orari i një episodi tregon transmetimin e njoftuar, jo garanci për disponueshmërinë në një platformë streaming.

## Kryefaqja 10.4
- Watch-first Home: karta e madhe “ku e le” me backlog, episodin e radhës dhe episode të shpejta; sesion personal deri në 6 anime, filtrat Watching, episode të sapotransmetuara, rekomandime, kalendar dhe inbox.
- Mobile-first: bottom navigation me Home/Bibliotekë/Kalendar/Zbulo/Profil, cards horizontale swipe/snap dhe veprime të optimizuara për një dorë.
- Statistikat e mëdha dhe objektivi javor janë te Profili im → Statistikat e mia. Elementet e vjetra të Home ruhen të montuara për pajtueshmëri me funksionet ekzistuese, por janë të fshehura vizualisht.
- Sesioni ruhet në preferencat e bibliotekës personale dhe mbijeton rikthimin nga cloud. Veprimet mbi episode kërkojnë klikim të përdoruesit.

## Përditësimet 10.4.1
- Karta kryesore është kompakte në desktop; kartat “Vazhdo shikimin” tregojnë me madhësi të qartë S/EP dhe veprimin e drejtpërdrejtë `✓ +1 episod` (veçmas nga hapja e detajeve).
- Ndryshimet e bëra nga përdoruesi përditësojnë menjëherë Home, kalendarin, profilin dhe njoftimet. Orari publik kontrollohet çdo 30 minuta kur aplikacioni është aktiv dhe përsëri kur rikthehesh; katalogu i gjerë mbetet me cikël ditor. Kjo është *near-live polling*, jo push nga AniList.
- Sinkronizimi i heshtur nga cloud nuk mbishkruan ndryshime lokale të paruajtura dhe nuk e nxjerr përdoruesin nga faqja aktuale. Preferencat e sesionit/kujtesave ruhen gjatë cloud reload. Statusi i orarit shfaqet në Home.

- Kur publikohet një version i ri PWA, shfaqet një banner “Përditëso tani”. Rifreskimi bëhet nga përdoruesi dhe nuk lejohet gjatë sinkronizimit të ndryshimeve lokale të paruajtura.

## iPhone 10.5
- Ekrani i parë në telefon është feed-i i episodeve (Për t’u parë / Sapo dolën / Së shpejti), jo dashboard desktop. Navigimi i poshtëm: Episodet, Kalendari, Zbulo, Biblioteka, Unë.
- Progres +1 episod me një prekje, detaje veçmas, rifreskim manual, badge i njoftimeve dhe kartë instalimi Safari. Përdor të njëjtën bibliotekë të sigurt Supabase; nuk krijohet databazë e dytë.
- Instalim: Safari → Share → Add to Home Screen → Open as Web App → Add. Ky është PWA i instalueshëm, jo paketë IPA/App Store. Aplikacioni kërkon internet për shërbimet cloud dhe katalogun; njoftimet jashtë aplikacionit kërkojnë backend Web Push të veçantë.

## Arkitektura
`index.html`: struktura e faqes dhe ngarkimi i moduleve.  
`assets/app.js` / `assets/app.css`: aplikacioni ekzistues, i nxjerrë nga skedari monolitik pa ndryshuar përmbajtjen.  
`assets/pro-*.js` / `assets/pro-features.css` / `assets/pro-visual-101.css` / `assets/pro-home-102.css`: funksionet e reja si module të pavarura.  
`manifest.webmanifest`, `sw.js`, `icon.svg`: instalimi dhe cache-i i skeletit të faqes.  
`tests/pro-smoke.test.cjs`: prova të moduleve, strukturës dhe sintaksës.

Për testet lokale: `npm test` (Node 20+; nuk ka varësi npm).

## Ruajtja dhe siguria
Supabase Auth dhe RLS ndajnë bibliotekat personale. Profili nis privat; lista e përmbledhur ndahet publikisht vetëm pas aktivizimit nga përdoruesi ose me miqësinë e pranuar. Komentet dhe raportimet ruhen në tabela të veçanta. Në HTML ka vetëm publishable key; **mos vendos kurrë service-role/secret key në repo**.

Deploy i kodit nuk duhet të fshijë bibliotekat; për siguri eksporto periodikisht kopje rezervë.

<!-- Production deployment sync: AnimeTrack 10.5.1 iPhone PWA release. -->

## Korrigjimi 10.5.1 në iPhone
- Feed-i i episodeve nuk fshihet më nga rregullat e vjetra të dashboard-it; vetëm pamja desktop fshihet në mobile.
- Test real shfletuesi për hapjen e feed-it, kalimin +1 episod dhe pesë tab-et në Chromium dhe Safari WebKit.
- Një rekord i paplotë episodi nuk e bllokon tërë aplikacionin; shfaqet veprim rikuperimi.
