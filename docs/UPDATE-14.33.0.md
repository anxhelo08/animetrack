# Update 6 — Matje dhe dukshmëri (14.33.0)

## Ndryshimet

- Lighthouse mat të katër faqet publike në profil mobile, tri herë secilën, me pragje për LCP, TBT, CLS dhe SEO. Një përmbledhje me mediana ruhet bashkë me raportet dhe shfaqet te GitHub Actions.
- Kontroll ditor/manual për disponueshmërinë dhe dukshmërinë publike: metadata, canonical-et, ankorat/lidhjet publike, JSON-LD, sitemap, robots dhe llms.txt. Raporte JSON/Markdown dhe exit code jo zero kur një kontroll dështon.
- Udhëzues praktik për Google Search Console, paraqitjen e sitemap-it dhe krahasimin e të dhënave reale me matjet laboratorike.
- Supozim: matje nga CI dhe përgjigje publike, pa instaluar analytics në pajisjet e përdoruesve. Nuk ndryshon CSP apo forma e bibliotekës.
- U hoq vetëm kufizimi i vjetër që kërkonte saktësisht dy workflow-e; monitori i ri ka testet e veta të sjelljes.

Google Search Console mbetet në pritje të kodit publik të verifikimit nga pronari dhe verifikimit në llogarinë Google. Kontrolli ditor fillon sipas scheduler-it të GitHub; ky nuk garanton orë ekzekutimi apo alarm të menjëhershëm. Nuk është monitorim i llogarive private ose i gjithë katalogut.

Shih [udhëzuesin e matjeve](MEASUREMENT-AND-DISCOVERY.md) për pragjet, raportet dhe hapat e pronarit.

## Gjetja nga matjet

Matja fillestare e kryefaqes dha LCP median 5287 ms, mbi pragun ekzistues 4500 ms; bllokimi ishte te shfaqja e titullit pas ngarkimit të moduleve. Fallback-u i hershëm tani shfaq vetëm prezantimin publik, pasi CSS është gati, për vizitorët pa sesion të ruajtur dhe pa callback identifikimi. Kontrollet mbeten inert derisa të verifikohet nisja. Sesionet e ruajtura ose storage i paarritshëm presin rrjedhën normale; gabimet rikthejnë ekranin e provës përsëri. Pragu LCP nuk u rrit.

## Rezultatet e verifikimit

Typecheck, lint, format:check, npm test, build dhe test:performance kaluan. 616 teste unit në 89 skedarë; 47 prova shfletuesi kaluan, 1 u anashkalua nga kushti ekzistues i profilit. Chromium desktop dhe përmasat e iPhone; Safari fizik nuk u testua.

Pas përfundimit të testeve të tjera, kryefaqja u mat sërish në izolim. Mediana përfundimtare nga tri hapje: LCP 2653 ms, TBT 82 ms, CLS 0.002. Matja fillestare: LCP 5287 ms. Ky është rezultat laboratorik, jo garanci për çdo pajisje.

| Faqja | LCP median ms | TBT median ms | CLS | SEO /100 |
| --- | --- | --- | --- | --- |
| Kryefaqja | 2653 | 82 | 0.002 | 100 |
| Instalimi | 1313 | 0 | 0 | 100 |
| Ndihma | 902 | 0 | 0 | 100 |
| Player-i | 754 | 0 | 0 | 100 |

`lhci assert` kaloi për 4 URL dhe 12 raporte. Buxhetet e bundle-ve mbeten 306960/310000 B gzip në nisje dhe 345476/346000 B gjithsej. Fallback-u publik boot.js është jashtë këtyre bundle-ve dhe madhësia e script-eve kontrollohet gjithashtu nga Lighthouse. Kontrolli HTTP kundrejt serverit kryesor kaloi; ekzekutimi i parë i workflow-t ditor dhe raportet reale të Google mbeten për t'u vëzhguar pas publikimit.
