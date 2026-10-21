# Loti i parë: korrektësia mobile

Përditësim i analizës mobile të 18 tetorit, mbi commit-in `01ae22a`.

- Panelet që ngarkohen me vonesë vendosen drejtpërdrejt në skedën e tyre: aktorët/krijuesit te “Aktorët”, disponueshmëria te “Përmbledhja”. Loading, gabimi, riprovimi dhe të dhënat mbeten në të njëjtin destinacion. Ankorat desktop ruhen.
- Heatmap i profilit ka një përmbledhje grafike të emërtuar dhe listë tekstuale për lexuesit e ekranit me 84 ditët; qelizat dekorative nuk kanë më etiketa ARIA të pavlefshme. Rajoni horizontal mund të fokusohet me tastierë.
- Filtrat aktivë kanë semantikë grupi. Numri në filtrin aktiv trashëgon ngjyrën e tekstit të butonit, duke shmangur kombinimin e gabuar të sfondit/ngjyrës nga dy shtresa CSS.
- Layout-i kompakt përdoret për gjerësi deri në 760px, ose për pamje deri në 960px me lartësi deri në 500px. Kështu telefoni 844px horizontal ruan Home të episodeve dhe pesë destinacionet poshtë. CSS dhe kontrollet JavaScript përdorin të njëjtin kusht; tabletët vertikalë mbi 760px dhe desktop mbi 960px ruajnë layout-in e mëparshëm. Rregullat plotësuese desktop përshtaten bashkë me ato mobile.

Nuk ka ndryshim të skemës së bibliotekës, CSP-së, databazës, transportit të llogarisë ose komandave të progresit. Kategoria parazgjedhje e bibliotekës mbetet “Aktive”; zgjedhja e ardhshme Aktive/Në plan i përket lotit të dytë.

## Verifikimi

Testet e reja të shfletuesit mbulojnë shkarkimin e vonuar, gabimin e ofruesit dhe riprovimin, ndërrimin e sezonit, rihapjen me modul të ngarkuar, profilin dhe numërimin me 500 tituj, si dhe kthimin portret/horizontal në 320/390/430px. Kontrollet axe kryhen në gjithë dokumentin për bibliotekën, profilin dhe Home horizontal.

Kaluan typecheck, lint, format:check, 666 teste unitare, npm test dhe build. Buxhetet mbeten brenda kufijve: JavaScript fillestar 301,470/305,000 bytes gzip; total 363,234/364,500. Në paketën përfundimtare kaluan 19 prova regresioni Chromium mobile/desktop; 9 kombinime jo të aplikueshme u anashkaluan. Kaluan edhe kontrollet e temës së çelët, migrimit IndexedDB, offline +1, historikut kronologjik, ruajtjes së kopertinave të leximit dhe importit të grupuar.

Provat përdorin Chromium dhe të dhëna sintetike, përfshirë përgjigje të simuluara të aktorëve. Nuk certifikojnë shërbimet live të ofruesve, Safari fizik ose VoiceOver. Panelet opsionale të detajeve vazhdojnë të kërkojnë shkarkimin e parë online, sipas modelit ekzistues të cache-it.
