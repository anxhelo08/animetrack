# Matje dhe dukshmëri — AnimeTrack

## Çfarë kontrollohet automatikisht

- Çdo push/PR: buxhetet e JavaScript dhe Lighthouse për kryefaqen, instalimin, udhëzuesin e player-it dhe ndihmën. Tre hapje mobile për çdo faqe; raporti shfaq medianat LCP, TBT, CLS dhe SEO në GitHub Actions → AnimeTrack CI → Lighthouse performance budgets.
- Pragjet: LCP ≤4500 ms, TBT ≤300 ms, CLS ≤0.1, SEO ≥90/100. Lighthouse është test laboratorik; TBT nuk është INP dhe SEO score nuk tregon pozicionin në Google.
- Çdo ditë rreth 07:23 UTC: GitHub Actions → Public visibility monitor kontrollon HTTP 200, metadata, canonical, noindex aksidental, lidhjet ndërmjet faqeve publike, ankorat e udhëzuesit, JSON-LD, robots, sitemap dhe llms.txt. Orari i GitHub mund të vonohet; nuk është monitorim në kohë reale. Workflow mund të ndalet nga GitHub pas mungesës së aktivitetit në një repo publike.
- Raportet ruhen si artefakte; dështimi shfaqet si run i kuq. Njoftimet me email varen nga cilësimet personale të GitHub → Notifications → Actions. Ky update nuk dërgon mesazhe te persona të tjerë.

Nga terminali: `npm run check:public` kontrollon serverin kryesor. Për një preview lokal përdor `AT_PUBLIC_CHECK_ORIGIN=http://127.0.0.1:8765 npm run check:public`; canonical-et prapë duhet të tregojnë adresën publike kryesore. HTTP elapsedMs përfshin leximin e përgjigjes, nuk është Core Web Vital dhe nuk vendos prag shpejtësie për serverin live.

## Google Search Console — hapi që kërkon llogarinë Google

1. Hap https://search.google.com/search-console/ dhe shto pronë **URL prefix**: `https://animetrack-flax.vercel.app/`. Prona Domain kërkon DNS; për nën-domain-in vercel.app përdor URL prefix.
2. Te verifikimi zgjidh **HTML tag**. Dërgo vetëm vlerën publike `content` të `google-site-verification` që ta shtojmë në head. Mos dërgo fjalëkalime, cookies ose token hyrjeje. Kodi nuk mund të sajohet nga aplikacioni.
3. Pas publikimit të tag-ut, kliko Verify në Google. Mbaje tag-un edhe pas verifikimit.
4. Te Sitemaps paraqit `https://animetrack-flax.vercel.app/sitemap.xml`.
5. Te URL Inspection kontrollo `/`, `/help.html`, `/install.html` dhe `/integrations/player-guide.html`. Nëse janë të pranueshme, kërko indeksimin. Vendimi dhe koha i përkasin Google.
6. Krahaso periudha 28-ditore te Performance: klikimet, përshtypjet, CTR dhe pozicioni mesatar, sipas faqes dhe pajisjes. Shiko Pages për gabime indeksimi.
7. Te Core Web Vitals shiko LCP, INP dhe CLS për telefon. Raportet reale kërkojnë trafik të mjaftueshëm; mungesa e raportit nuk është rezultat zero apo provë që faqja është e shpejtë. Objektivat reale: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 në percentilin 75.

Statusi fillestar: metadata dhe sitemap janë publike; regjistrimi/verifikimi dhe paraqitja e sitemap-it në llogarinë Google mbeten të papërfunduara derisa të kemi kodin dhe verifikimin nga pronari.

## Privatësia dhe krahasimi

Këto kontrolle lexojnë vetëm përgjigje publike. Nuk hyjnë në llogari, nuk lexojnë bibliotekën dhe nuk instalojnë analytics në pajisjen e përdoruesit. Raporti HTTP nuk ruan HTML apo përjashtime që mund të përmbajnë të dhëna sensitive. Nuk ka hosts të rinj CSP.

Ruaj raportet e një commit-i para ndryshimit dhe të atij pas ndryshimit, në të njëjtin profil mobile. Mos krahaso një matje laboratorike me rezultat nga një telefon fizik si të ishin i njëjti test. Një matje e vetme e mirë nuk zëvendëson historikun real.
