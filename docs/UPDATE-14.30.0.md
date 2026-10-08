# Update 14.30.0 — reagimi kur shënon episode

Përfundimi i pjesës së episodeve të Update 2. Supozimi: përmirësimi i shpejtësisë ruan hapjen ekzistuese të kartës së episodit dhe opsionet për Diary, vlerësim dhe zhbërje.

## Ndryshimet

- Hapja e kartës bën një rindërtim të menjëhershëm. Rifreskimet nga shënimi, ngarkimi i detajeve dhe komentet bashkohen në frame-in tjetër.
- Përditësimet e planifikuara anulohen pas një rifreskimi të menjëhershëm; nuk aplikohen në një panel të mbyllur, episod tjetër ose llogari tjetër.
- Diskutimi rivendoset edhe kur ndryshon llogaria. Përgjigjet e komenteve kontrollojnë llogarinë dhe çelësin e bibliotekës para se të përditësojnë panelin.
- Përgatitja e kopjes për IndexedDB kontrollon formatin një herë dhe llogarit checksum-in një herë. Kopja e mëparshme dhe kopja e lexuar pas shkrimit vazhdojnë të kontrollohen me format dhe checksum.
- Ruajtja lokale e progresit mbetet e menjëhershme, para njoftimit të suksesit. Formati i bibliotekës, migrimet, backup-et dhe journal-i nuk ndryshojnë.

## Matjet

Chromium me pamjen e iPhone, 500 tituj, procesor i ngadalësuar 4 herë, burime të simuluara. Tre matje të ndara para/pas; këto janë matje laboratorike dhe kanë luhatje.

| Matja | 14.29.1 | 14.30.0 |
| --- | --- | --- |
| Koha deri te lista e rifreskuar, ms | 1876 / 1997 / 2128 | 1963 / 1632 / 1874 |
| Mediana deri te lista e rifreskuar | 1997 ms | 1874 ms |
| Bllokimi fillestar pas klikimit, ms | 595 / 605 / 621 | 331 / 321 / 320 |
| Mediana e bllokimit fillestar | 605 ms | 321 ms |

Bllokimi fillestar u ul rreth 47%. Koha e përgjithshme e reagimit u ul rreth 6% sipas medianës; përmirësimi i bllokimit nuk është i barabartë me një përmirësim 47% të gjithë aplikacionit.

## Kontrollet

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`: kaluan.
- 606 teste unitare në 88 skedarë kaluan.
- Playwright: 28 teste kaluan në Chromium desktop/telefon; 6 teste u anashkaluan sipas kushteve ekzistuese për pajisjen. U kontrolluan progresi, Diary, vlerësimet, zhbërja, lidhjet, fotot, rikuperimi i bibliotekës dhe navigimi me 500 tituj.
- Testet e reja kontrollojnë bashkimin e rifreskimeve, anulimin, episodin/llogarinë e ndryshuar, panelin e mbyllur dhe ruajtjen e kopjes së mëparshme kur journal-i është i pavlefshëm.
- Testet e reja të shfletuesit numërojnë rindërtimet reale në DOM dhe kontrollojnë shënimin në Diary dhe ruajtjen pas reload-it.
- `npm run test:performance`: kaloi. JavaScript fillestar: 306960/310000 byte gzip; gjithsej: 345476/346000.

## Kufijtë

iPhone fizik dhe Safari/WebKit nuk janë verifikuar në këtë mjedis. Lista me 500 tituj ende ka punë të kushtueshme në ruajtje dhe në përpunimin e përgjigjeve cloud; ky publikim nuk pretendon se ka eliminuar çdo vonesë. CSP dhe ndihmësit e sigurt të HTML nuk ndryshojnë.
