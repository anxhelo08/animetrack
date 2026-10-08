# Update 14.29.1 — kërkimi Manga/Manhwa

Pjesa e parë e Update 2: reagimi gjatë shkrimit dhe trajtimi i burimeve të ngadalta.

## Ndryshimet

- Kur afati i përbashkët prej 6.5 sekondash përfundon, kërkimi ruan rezultatet dhe faqëzimin e burimeve që janë përgjigjur. Përgjigjja shënohet si e pjesshme.
- Anulimi nga përdoruesi mbetet anulim: përgjigjet e kërkimit të vjetër nuk zëvendësojnë kërkimin e ri.
- Shkrimi anulon dhe çaktivizon menjëherë kërkimin e vjetër, për të shmangur rifreskimin e pamjes gjatë pritjes para kërkimit tjetër.
- Pritja pas shkrimit është 250 ms, nga 350 ms. Kjo ul pritjen e planifikuar me 100 ms; nuk mat ose garanton kohën e përgjigjes së burimeve.
- Nëse afati përfundon pa asnjë përgjigje të vlefshme, shfaqet mesazhi për të provuar përsëri.

## Verifikimi

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`: kaluan.
- 599 teste unitare në 87 skedarë kaluan.
- Playwright: 8 teste kaluan në Chromium desktop/telefon, 2 teste u anashkaluan nga kushtet ekzistuese për pajisjen. Kërkimi i Doom Breaker, The Player Who Can’t Level Up dhe The Beginning After the End u kontrollua me përgjigje të simuluara të burimit, jo si provë e mbulimit real të katalogut.
- Teste të reja sjelljeje: rezultate të ruajtura pas afatit, anulim pas përgjigjes së parë, kërkimi i vjetër nuk rindërton rrjetën gjatë shkrimit.
- `npm run test:performance`: kaloi; JavaScript fillestar 306719/310000 byte gzip, gjithsej 345235/346000.

## Kufijtë

Ky publikim trajton kërkimin. Optimizimi i shënimit të episodeve mbetet pjesa tjetër e Update 2. Burimet, identitetet e titujve dhe forma e të dhënave personale nuk ndryshojnë. Nuk pretendohet mbulim i çdo titulli ose numër i njohur kapitujsh për çdo burim. iPhone fizik dhe Safari nuk janë verifikuar në këtë mjedis.
