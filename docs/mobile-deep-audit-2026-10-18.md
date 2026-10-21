# Analizë e thellë mobile: dizajni dhe kodi

**Zbatimi:** korrigjimet e lotit të parë dokumentohen te [përditësimi i 21 tetorit](mobile-first-lot-2026-10-21.md). Ky raport ruan gjendjen historike të analizuar.

Method: dual-agent (A: /root/mobile_design_review · B: /root/mobile_browser_evidence), me analizë REA të veçantë nga agjenti kryesor.

Baza: commit `01ae22a064aafc5e9390aeec849b250ad4e842f0`, 18 tetor 2026. Sipërfaqja: `src/modules/mobile-presentation.js` dhe rrjedhat që ajo kompozon. Mënyra: Operate, pra kryerja e detyrës ka përparësi ndaj dekorimit. Ky raport dokumenton gjendjen; rekomandimet nuk janë implementime të publikuara.

## Përfundimi

AnimeTrack ka identitet të dallueshëm: kopertinat, ngjyrat vjollcë/lilac, progresi personal dhe Home te episodi i radhës. Këto duhen ruajtur. Problemi kryesor mobile është grumbullimi i kontrolleve përpara përmbajtjes në ekranet dytësore. Problemi kryesor teknik është kompozimi i së njëjtës pamje nga disa kontrollues, veçanërisht kur një modul mbërrin pas krijimit të skedave.

Gjetja funksionale me përparësinë më të lartë: skeda “Aktorët” mbetet me mesazh bosh, ndërsa paneli i aktorëve dhe butoni i tij i riprovimit futen te “Episodet”. Kjo u riprodhua si në hapjen e parë, ashtu edhe në rihapje. Përmirësimet e mëparshme të filtrave dhe ngarkimit fillestar janë reale, por nuk e kanë përfunduar thjeshtimin e përgjithshëm mobile.

## Metoda dhe kufijtë

- Dy vlerësime të pavarura. A përfundoi dhe u regjistrua përpara se rezultatet B të hynin në sintezë. A nuk pa detektorin apo raportin B; B nuk pa A.
- A: 11 pamje të freskëta në 390×844. B: 40 pamje, portret 320/390/430×844 dhe horizontal 844×320/390/430; Home, Zbulo, Biblioteka, filtrat, detajet, shënimet, leximi, aktiviteti, profili, cilësimet dhe formulari i shtimit. B ekzekutoi 3 skenarë të gjerësive dhe 2 skenarë të fokusuar.
- Chromium i sistemit, build prodhimi në localhost dhe llogari sintetike nga fixture ekzistuese. Nuk u shkrua në bibliotekë reale. Katalogët e jashtëm u simuluan me përgjigje bosh/gabimi; suksesi i ofruesve nuk certifikohet.
- REA 6.7.0 u tentua realisht për dy module mobile. CLI përfundoi `execution_failure`, te `worker startup`. `rea doctor` u ekzekutua; jo të gjitha analizuesit e përgjithshëm të REA janë instaluar. Kjo nuk provon shkakun e dështimit të worker-it JavaScript.
- U përdor biblioteka statike e REA për 128 skedarë JavaScript, si tekst inert. 224,489 nyje AST; 116 rezultate `complete`, 12 `partial`, 0 gabime sintakse. `partial` tregon vlera dinamike të panjohura, jo domosdoshmërisht defekt. Ky rezultat nuk është Evidence kanonike ose graf semantik i plotë i CLI-së.
- Detektori Impeccable u tentua realisht; launcher-i mungon, exit 127. Numrat e detektorit janë të padisponueshëm, jo zero. Nuk pati overlay të injektuar. Evidenca vjen nga shfletuesi, axe dhe leximi i kodit.
- Safari/WebKit fizik, VoiceOver, tastiera reale iOS, safe-area reale dhe autentikimi live nuk u testuan. Matjet e performancës janë laboratorike, jo telemetri e përdoruesve.

## Vlerësimi i përdorimit

Vlerësim heuristik, jo rezultat automatik certifikimi:

| Parimi                 |        /4 | Arsyeja kryesore                                                                |
| ---------------------- | --------: | ------------------------------------------------------------------------------- |
| Gjendja e sistemit     |         3 | Navigimi/progresi janë të qartë; trajtimet e statusit ndryshojnë mes ekraneve   |
| Gjuha e përdoruesit    |         2 | Diary, Rewatch, Rich Details dhe etiketa versionesh dalin në produkt            |
| Kontrolli dhe dalja    |         3 | Kthimi dhe pastrimi i filtrave janë të disponueshëm                             |
| Konsistenca            |         2 | Leximi, ditari dhe profili përdorin struktura të ndryshme                       |
| Parandalimi i gabimeve |         3 | Episode të ardhshme jo të shënueshme; veprimet kanë identitet të qartë          |
| Njohja pa memorizim    |         2 | Kopertinat ndihmojnë; titujt në plan kërkojnë zbulim të statusit jashtë ekranit |
| Efikasiteti            |         3 | +1, filtra dhe import; mjetet dytësore kërkojnë shumë udhëtim                   |
| Minimalizmi            |         2 | Shumë hyrje e kontrolle përpara përmbajtjes                                     |
| Rikuperimi nga gabimet |         2 | Riprovimi ekziston, por paneli i aktorëve vendoset në skedën e gabuar           |
| Ndihma                 |         2 | Shpjegime lokale të dobishme, jo gjithmonë pranë vendimit                       |
| **Gjithsej**           | **24/40** | **E përdorshme, me nevojë për thjeshtim të konsiderueshëm**                     |

## Çfarë duhet ruajtur

1. Home me episodin e radhës, shënimin e shpejtë dhe kopertinat. Historia duhet të mbetet kronologjike: më e vjetra sipër, më e reja poshtë. Nuk rekomandohet zëvendësim me dashboard statistikash.
2. Pesë destinacionet kryesore me ikonë dhe tekst; treguesi aktiv dhe hapësira e rezervuar e dock-ut funksionojnë në mostrat portret.
3. Siguria e ndryshimeve: ATHTML, CSP, ruajtja ekzistuese, kopjet rezervë të importit dhe përputhja e qartë e sezoneve. Asnjë rekomandim nuk kërkon ndryshim të formatit të të dhënave.

## Gjetjet sipas përparësisë

### M01 — P1: Aktorët mbërrijnë në skedën e gabuar

**Provë:** `mobile-B/provider-placement.json`, `cast-cold-390.png`, `cast-warm-390.png`; A e vuri re veçmas te detajet. Pas përfundimit të ngarkimit, `.at134-rich` dhe `.at133-watch` janë brenda panelit Episodes. Kur zgjidhet Actors, ato janë të fshehura dhe shihet vetëm placeholder-i.

**Shkaku:** `app.js:2184–2199` nis attach pa e pritur; `deferred-detail.js:36–48` rifillon pas await. Ndërkohë `mobile-presentation.js:522–534` ka lëvizur `.seasons-topline` te Episodes. `watch.js:135–136` dhe `rich-details.js:181–182` zgjedhin atë ankorë. Kjo ndodh edhe me modul të ngrohtë sepse await mbetet asinkron.

**Ndryshimi:** cakto pika montimi të qarta: aktorët te Cast, disponueshmëria te paneli i përcaktuar i përmbledhjes/ofruesve. Mos kërko ankorë duke shëtitur gjithë pemën. Gjendja bosh, gabimi, loading dhe suksesi të jenë brenda të njëjtit panel.

**Pranimi:** test cold/warm me vonesë moduli dhe rrjeti; zgjedhje sezoni gjatë ngarkimit; ndryshim titulli/llogarie; riprovim dhe offline. Testi të verifikojë prindin semantik dhe dukshmërinë pas zgjedhjes së skedës, jo vetëm praninë `.toBeAttached()`.

### M02 — P1: Manga/Manhwa fsheh detyrën pas shumë shtresave

**Provë:** A `reading.png`. Hero, shpjegim, WeebCentral, ndërrues media, lloj leximi, katër destinacione, More, kërkim dhe filtra zënë ekranin e parë; zbulo/biblioteka bosh vijnë më poshtë. Burime: `reading.js:332`, `reading.js:521`, `reading.css:6`.

**Ndryshimi:** titull kompakt; një ndërrues media; Biblioteka/Kërkimi si dy rrugë kryesore. Kalendari, njoftimet dhe mjetet dytësore te “Më shumë”. Në boshllëk, “Zbulo tituj” përpara filtrave; shtimi manual dytësor.

**Pranimi:** në 320–430px, veprimi i parë i dobishëm të shihet pa kaluar një ekran kontrollesh. Provo edhe bibliotekë të mbushur dhe emra të gjatë. Ruaj kartat dhe imazhet kur rihapet leximi.

### M03 — P1: Aktiviteti nis me shpjegime dhe zero, jo me historikun

**Provë:** A `diary.png`; `diary.js:92`, `diary.css:36`. Shkurtesat, hyrja e madhe, katër statistika dhe heatmap vijnë para regjistrimeve. Me progres të importuar pa data, përdoruesi sheh zero përpara shpjegimit.

**Ndryshimi:** “Aktiviteti yt” me një rresht privatësie; ngjarja e fundit ose gjendja e saktë “Ka progres të importuar, por ende jo histori me datë” lart. Statistikat dhe filtrat si hapje dytësore.

**Pranimi:** regjistrimi ose shpjegimi relevant të jetë në ekranin e parë; mos shpik data për progresin e importuar dhe mos ndrysho rendin e historikut të Home.

### M04 — P1: Titulli në plan mund të duket sikur është zhdukur

**Provë:** A `library.png`: 9 tituj të ruajtur, “Biblioteka aktive 6”; “Në listë” jashtë pjesës fillestare të shiritit horizontal. Të dhënat nuk humbin; problemi është zbulimi. `library-filters.js:91`, `mobile-premium.css:75–90` dhe rregullat e shiritit.

**Ndryshimi i rekomanduar:** dy zgjedhje të dukshme “Aktive / Në plan”, secila me numër, pastaj një kontroll kompakt për statuset dytësore. Kjo ruan fokusin ekzistues te aktivet. Alternativë produkti: të gjitha si parazgjedhje; kërkon vendim të qartë sepse ndryshon semantikën ekzistuese.

**Pranimi:** një përdorues i ri gjen titullin e saposhtuar në plan pa njohur shiritin horizontal. Mesazhi pas shtimit ofron “Shiko në listë”.

### M05 — P2: Probleme konkrete aksesueshmërie

- **Heatmap i profilit:** axe gjen `aria-prohibited-attr` në 84 qeliza span dhe `scrollable-region-focusable` te `.at-profile-activity`, në të tria gjerësitë. Një familje problemi, jo 85 defekte të ndryshme. `profiles.js:68`, `profiles.js:104`, `foundation.css:871`, `layout-social.css:476`. Përdor strukturë grafike/listë me përshkrim ose përmbledhje tekstuale ekuivalente; rajoni scroll të jetë i përdorshëm me tastierë.
- **Filtrat aktivë:** `library-filters.js:52` krijon div me aria-label pa rol të emërtueshëm. Shto semantikë group ose titull/lidhje etikete; mos hiq emrat e butonave.
- **Numri aktiv me 500 tituj:** kontrast i matur 1.68:1 te `.tiny-count`, #302545 mbi #59417f, 11px bold. Kërkohet 4.5:1 për këtë tekst. Mos përgjithëso se çdo numër dështoi; fixture me numër të vogël nuk prodhoi të njëjtin sinjal.
- **Horizontal:** tetë nyje titujsh/metadatash me 1.95:1 dhe 2.3:1. Rregullo çiftet e ngjyrave edhe në pamjen legacy.

**Pranimi:** axe në të gjithë dokumentin dhe gjendjet aktive, plus tastierë dhe VoiceOver real. Një test i kufizuar vetëm te Home nuk zbulon profilin ose filtrat.

### M06 — P2: Rrotullimi në horizontal ndërron sistemin e pamjes

Gjerësia 844 kalon breakpoint 760 dhe aktivizon Home e vjetër `.at114-*`, me kompozim tjetër dhe pa navigimin poshtë të telefonit. Kontrastet e mësipërme janë defekte të konfirmuara; zgjedhja e navigimit në horizontal është vendim produkti. Pamjet ruajnë scroll-in, prandaj nuk provojnë header desktop të munguar përgjithmonë.

Përcakto politikë të qëndrueshme për telefon me lartësi të ulët. Provo 844×390, jo vetëm portret. Mos përdor një kufi të vetëm gjerësie si përkufizim të gjithë pajisjes. Ruaj zoom-in dhe sjelljen tablet/desktop.

### M07 — P2: Paneli i filtrave përzien vendime dhe mirëmbajtje

Filtrat janë më të qartë se para përditësimit, por hapja e panelit bashkon statusin dytësor, median, episodet, progresin, renditjen, importin dhe riparimin. Ndaj “Filtra dhe renditje” nga “Mjetet e bibliotekës”. Përmbledhja e rezultateve të mbetet pranë filtrimit.

Në 320px etiketat e fundit të disa shiritave priten fillimisht. Janë scroll horizontal i qëllimshëm dhe kontrollet u arritën, jo defekt global i paarritshmërisë. `.mobile-library-controls` në CSS nuk përputhet me elementin aktual `#mobile-library-controls.library-filter-panel`; kontrollo dhe hiq rregullat e vjetra pasi të ketë prova sjelljeje.

### M08 — P2: Detajet përsërisin hero-n dhe ngatërrojnë shënimet

Hero me kopertinë është i vlefshëm në hyrje, por konsumon shumë vend kur përdoruesi lëviz mes skedave. Përdor header kompakt pas scroll-it dhe skeda të qëndrueshme. Te “Shënimet” shfaq shënimet/editorin përpara statistikave/Rewatch; zhvendos shikimin përsëri te veprimet e episodeve. Burime `mobile-presentation.js:430–464`, `:543–557`, `mobile-premium.css:803`.

### M09 — P2: Profili përqendrohet te menaxhimi i llogarisë

A `profile.png`: identitet i madh, Copy/Edit, miq, instalim, pastaj skedat. Kompakto identitetin; një Edit; instalimi te Cilësimet; të preferuarat dhe historia afër emrit. Ruaj sinjalin e privatësisë. Install ka lartësi 39px; rekomandimi mobile është 44px, por kjo vetëm nuk provon shkelje WCAG 2.2 për madhësinë 24px.

### M10 — P2/P3: Zbulo, gjuha dhe gjendjet bosh

Nëntë kategori me peshë të barabartë dhe shkurtesa të tjera konkurrojnë me kërkimin. Grupo median veç listave të zbulimit; mbaj vetëm një hyrje për lajmet. Standardizo Ditari, Shiko përsëri, Aktorët dhe krijuesit; hiq versionet interne nga kartat. Te Home, shenja check është herë veprim dhe herë gjendje: ruaj trajtimet vizuale të ndryshme dhe provo kuptimin me fillestar. Fshi seksionin bosh të titujve të vjetër kur nuk ka çfarë të vazhdohet.

## Çfarë tregon kodi

| Matja                                                      |                       Gjendja |
| ---------------------------------------------------------- | ----------------------------: |
| Burim JavaScript i analizuar                               | 1,291,366 bytes / 128 skedarë |
| app.js                                                     |                 306,944 bytes |
| Nyje funksionesh brenda app.js, përfshirë nested/arrow     |                           987 |
| Thirrje addEventListener në app.js                         |                            98 |
| Riasenjime render/renderHome/renderDetail/v81RenderEpisode |                            28 |
| Thirrje native prompt/confirm/alert në app.js              |                            11 |
| mobile-presentation.js                                     |                  40,891 bytes |
| reading.js                                                 |                  73,292 bytes |
| CSS burim në src/styles, 25 skedarë                        |                 607,122 bytes |
| Rregulla CSS / deklarime !important                        |                   6,083 / 307 |
| CSS kryesore e build-it                                    |    582,237 bytes; 99,635 gzip |
| JavaScript fillestar i build-it                            |                  301,095 gzip |

Numrat AST nuk janë numër përgjegjësish të pavarura. Rregullat CSS nuk janë selektorë unikë ose rregulla të përdorura në ekran. Matjet nuk provojnë vetë ngadalësi. REA vëren 15 vende rrjeti dhe 25 vende storage në app.js; këto janë vende në burim, jo kërkesa reale të numëruara.

**Përparësitë teknike:**

1. Një pronar për strukturën e detajeve dhe pika montimi stabile për module asinkrone. M01 është provë konkrete pse kjo nevojitet.
2. Nxirr komandat e bibliotekës dhe llogarisë gradualisht nga app.js; injekto varësitë dhe ruaj window.* publike. Mos bëj migrim framework-u ose rishkrim masiv.
3. Konsolido CSS sipas sipërfaqes. Hiq override vetëm pas krahasimit portret/horizontal/desktop, theme dhe states. Mos vendos një shtresë të re !important mbi çdo problem.
4. Mat CSS-in fillestar krahas JS-it. `main.js` kontrollon gatishmërinë e stylesheet-it para nisjes, prandaj pesha e CSS-it ka rëndësi për nisjen. Buxheti ekzistues i performancës mat vetëm JS gzip.
5. Ruaj keyed DOM, cache të modeleve dhe batching që tashmë ekzistojnë; mos i rindërto kartat pa nevojë. Mat selector/model/render veçmas, përpara optimizimit.

### Provë me 500 tituj

390px, Chromium CPU 4× më i ngadalshëm: 30 karta fillestare, 2,361 nyje DOM; 6 detyra të gjata me total 764ms, më e gjata 369ms. Hyrja deri në vëzhgim ishte 1,770ms, por përfshin 300ms pritje dhe overhead të testit. Nuk është kohë e pastër renderimi, p95, INP ose matje reale telefoni.

Kjo justifikon profilizim dhe përmirësim të punës së fillit kryesor; nuk justifikon pretendimin se vizatohen të 500 kartat. Shto performance marks për modelin dhe commit-in e DOM-it, përsërit disa herë me 50/500/2,000 tituj dhe histori të gjatë, raporto medianën/p95 vetëm me mostra të mjaftueshme.

## Rendi i punës i rekomanduar

| Loti                     | Përmbajtja                                                        | Kushti i përfundimit                                                                                                 |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1: korrektësia mobile    | M01, ARIA e filtrave/profilit, kontrastet, rrotullimi             | Aktorët funksionojnë cold/warm; kontrollet gjithëfaqëshe pa shkeljet e konfirmuara; navigim i qëndrueshëm horizontal |
| 2: bibliotekë dhe detaje | M04, M07, M08, gjuhë e unifikuar                                  | Titulli në plan gjendet; filtra/mjete të ndara; episode/shënime pa blloqe të huaja                                   |
| 3: ekranet dytësore      | M02, M03, M09, Zbulo                                              | Detyra/përmbajtja kryesore në ekranin e parë; boshllëqe me një veprim të qartë                                       |
| 4: kodi dhe shpejtësia   | pronarë kontrolluesish, CSS e konsoliduar, buxhet CSS dhe profile | matje të përsëritshme, regressione të ruajtjes/DOM dhe audit i ri vizual                                             |

Lotet mund të ndahen në commit-e më të vogla. Nuk vendosen afate pa implementuar dhe matur. Rendi teknik mund të ndryshojë kur nxjerrja e një pike montimi nevojitet për korrigjimin e parë.

## Përdoruesit që ekspozojnë problemet

- Përdoruesi i shpërqendruar me një dorë: Home punon mirë; leximi/aktiviteti kërkojnë scroll përpara detyrës, hero i detajeve përsërit punën.
- Fillestari: titulli i planifikuar duket i munguar; Diary/Rewatch/versionet shtojnë përkthim mendor; shtimi manual është më i spikatur se zbulimi në lexim.
- Përdoruesi me tastierë/lexues ekrani: etiketat e navigimit ndihmojnë; heatmap, semantika e filtrave dhe futja asinkrone në skedë kërkojnë korrigjim e provë reale.

## Verifikimi dhe evidenca

Kaluan typecheck, lint, format:check, `npm test` me 97 skedarë/666 teste dhe build i veçantë. Provat B përfunduan 5 skenarë matjeje dhe A një skenar pamjesh. Kjo nuk është e gjithë suite Playwright në çdo browser. Nuk u ndryshua produkti, databaza, CSP apo konfigurimi i prodhimit.

Përmbledhje e riprodhueshme: `docs/rea-mobile-analysis-2026-10-18.json`. Evidenca lokale: `/workspace/research/rea-mobile-static-full.json`, `mobile-code-metrics.json`, `mobile-design-A.md`, `mobile-evidence-B.md`, `mobile-A/`, `mobile-B/`. Pamjet përdorin të dhëna sintetike, jo bibliotekën private të përdoruesit.

Questions skipped: analiza dhe drejtimi mobile janë të përcaktuara; vetëm zgjedhja Aktive/Në plan kundrejt të gjitha titujve si parazgjedhje mbetet preferencë produkti, jo pengesë për raportin.
