# Update 4 — SEO bazë (14.31.0)

Supozimi: domeni publik kryesor mbetet `https://animetrack-flax.vercel.app`. Faqet publike aktuale janë kryefaqja, instalimi dhe udhëzuesi i player-it; pamjet e bibliotekës nuk kanë URL publike të veçanta.

## Ndryshimet

- Titull i qëndrueshëm dhe përshkrim i veçantë në shqip për secilën faqe publike. Versioni i publikimit mbetet në aplikacion, ndërsa titulli për kërkim përshkruan produktin.
- Një canonical absolut për çdo faqe, që nuk merr query parameters, emra përdoruesish ose të dhëna të bibliotekës.
- Open Graph dhe Twitter metadata për shpërndarje, me ikonën publike të markës.
- Favicon në `/icon.svg`, i arritshëm me URL publike.
- `/sitemap.xml` liston tri faqet publike që kthejnë HTTP 200. Nuk ka URL të llogarive, API-ve ose data të shpikura për përditësim.
- `/robots.txt` lejon faqet publike dhe assets; përmban lidhjen e sitemap dhe përjashton API-të dhe shkarkimet. Vercel shton `X-Robots-Tag: noindex` për `/api/*` dhe `/downloads/*`.
- `/llms.txt` lidh tri faqet publike për mjetet AI. Ky dokument është udhëzues publik; nuk është standard indeksimi i Google.
- Lidhje të zakonshme HTML lidhin kryefaqjen, instalimin dhe udhëzuesin.
- Udhëzuesi i player-it ka strukturë të plotë HTML, një H1 dhe seksione H2. CSS u nxor nga `<style>` në një skedar të jashtëm që punon me CSP ekzistuese.

## Kontrollet

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`: kaluan.
- 606 teste unitare në 88 skedarë kaluan.
- 18 teste SEO kaluan në Chromium desktop dhe pamjen e telefonit: metadata nga HTTP pa ekzekutuar JavaScript, sitemap i vlefshëm XML, URL që hapen, robots, llms, CSS nën CSP, favicon, lidhje dhe ndarja e metadata-s nga biblioteka personale.
- 12 teste të tjera të instalimit dhe kryefaqjes kaluan në desktop dhe telefon, përfshirë APK, instalimin web, hyrjen/regjistrimin dhe postera. Gjithsej 30 raste të shfletuesit u verifikuan në dy ekzekutime.
- Prettier nuk ka parser XML në projekt; sitemap u verifikua përmes parserit XML dhe përgjigjes HTTP në testet e shfletuesit.
- `npm run test:performance`: kaloi. JavaScript fillestar mbetet 306960/310000 byte gzip; gjithsej 345476/346000.

## Kufijtë

Robots dhe noindex janë udhëzime për crawler-at, jo kontroll aksesi; siguria ekzistuese e bibliotekës mbetet në fuqi. Ky update nuk përfshin prerender të faqeve të reja ose JSON-LD (Update 5), dhe as regjistrimin në Google Search Console (Update 6). Nuk ka ndryshim në formën e të dhënave personale ose në CSP. Safari/iPhone fizik nuk është testuar në këtë mjedis.
