# Update 5 — Prezantimi publik (14.32.0)

- Kryefaqja ka përmbajtje statike dhe udhëzim të përdorshëm pa JavaScript. Hyrja dhe ruajtja e progresit kërkojnë JavaScript; kontrollet që nuk mund të punojnë janë të fshehura në atë rast.
- `/help.html` shpjegon bibliotekën, episodet, manga/manhwa, kopjet rezervë dhe kufijtë offline, me lidhje të drejtpërdrejta për çdo temë.
- Lidhjet publike, sitemap dhe llms.txt përfshijnë udhëzuesin. Metadata e tij është në përgjigjen HTML pa ekzekutim JavaScript.
- Kryefaqja përmban JSON-LD WebApplication me çmim zero dhe pa vlerësime të sajuara. CSP mbetet e pandryshuar.
- Supozim: “Prezantim publik” nënkupton kryefaqen dhe ndihmën publike; bibliotekat personale nuk publikohen.
- U hoq një kufizim i vjetër testi që numëronte të gjitha stylesheet-et në burim dhe përjashtonte edhe fallback-un noscript. Përdorshmëria e tij kontrollohet tani në shfletues.

## Kontrollet

Typecheck, lint, format:check, npm test, build dhe buxhetet e JavaScript. Testet e shfletuesit mbulojnë metadata, sitemap, udhëzuesit, prezantimin pa JavaScript, CSP, hyrjen, karuselin dhe instalimin në Chromium desktop dhe përmasat e iPhone. Safari fizik nuk është verifikuar. Indeksimi nga kërkuesit nuk garantohet nga JSON-LD.

Rezultati: të gjashtë kontrollet kaluan; 606 teste unit në 88 skedarë dhe 36 teste të shfletuesit kaluan. Kontrolli pa JavaScript u përsërit edhe me viewport-in real të profilit iPhone: 2/2 kaluan. Startup gzip 306960/310000 B; JavaScript total 345476/346000 B, pa rritje kundrejt Update 4.
