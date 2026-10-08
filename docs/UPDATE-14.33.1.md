# Rikthimi i sjelljes në telefon dhe bibliotekën e leximit — 14.33.1

- Hapja fillestare e kryefaqes në telefon fokusohet te episodi i radhës (“Për të parë”). Kthimi nga seksionet e tjera ruan pozicionin që përdoruesi kishte zgjedhur.
- Historiku qëndron sipër radhës së shikimit. Episodet janë nga më i vjetri sipër te më i riu poshtë; shënimi shton episodin në fund dhe mban radhën në të njëjtin pozicion vizual.
- Rihapja e seksionit manga/manhwa nuk rindërton përmbajtjen e pandryshuar. Kur ndryshon metadata, kartat dhe fotot e titujve të tjerë ruhen si të njëjtat nyje DOM.
- Kontrollet ekzistuese për kapituj të rinj vazhdojnë. Ndryshimi shmang rindërtimin e pamjes; nuk çaktivizon burimet apo rifreskimet e nevojshme.
- AGENTS.md përfshin kërkesën e përdoruesit që sjelljet ekzistuese të ruhen në update të tjera dhe këto rrjedha të kenë teste regresioni.

Supozim: “hapet te Duke parë” nënkupton fokusin fillestar te radha e episodeve në kryefaqe, ndërsa historia mbetet sipër dhe është e arritshme me scroll. Forma e bibliotekës dhe progresi i ruajtur nuk ndryshojnë; CSP mbetet i pandryshuar.

Testet e sjelljes kontrollojnë identitetin e kartave/fotove pas rihapjes dhe gjatë përditësimit të një titulli, rendin e episodeve pas shënimit, fokusin e hapjes dhe pozicionet e ruajtura gjatë navigimit. Verifikimi në shfletues përdor Chromium me përmasa telefoni; Safari fizik mbetet i patestuar.

Prekja përsëri e butonit Kreu, kur je tashmë në kryefaqe, rikthen seksionin e episodeve për të parë; nuk e çon pamjen në fillim të historikut.

## Rezultati

Kaluan typecheck, lint, format:check, npm test, npm run build dhe test:performance. 618 teste unit në 89 skedarë; prova përfundimtare në Chromium desktop/iPhone: 25 kaluan dhe 21 u anashkaluan sipas kufizimeve ekzistuese të platformës. Testi me 500 tituj dhe CPU 4× kaloi bashkë me rikthimin e scroll-it. Buxheti gzip: 306958/310000 B në nisje dhe 345558/346000 B gjithsej.
