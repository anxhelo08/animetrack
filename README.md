# AnimeTrack 11.0 — Anime Universe Pro

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

**Kujtesat in-app janë funksionale.** Web Push jashtë aplikacionit është i përgatitur në kod, por nuk aktivizohet derisa migrimi, funksionet dhe çelësat VAPID të publikohen në mënyrë të sigurt. Orari i një episodi tregon transmetimin e njoftuar, jo garanci për disponueshmërinë në një platformë streaming.

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

## PC 10.6
- Watchlist në PC: kërkim i menjëhershëm në titull/zhanër, shfaqje progresive përtej 6 animeve dhe zhbërje e veprimit të fundit `+1 episod` me verifikim të historikut.
- Këto kontrolle janë vetëm në desktop: struktura e iPhone është e izoluar dhe ruan feed-in e episodeve.
- Nuk ka ndryshim të skemës së Supabase, migrim të bibliotekës apo ndryshim të statusit automatik pa veprim të përdoruesit.

## Quality 10.7
- Markimi i një episodi ruhet atomikisht në bibliotekën lokale: nëse ruajtja dështon, rikthehen progresi dhe historiku pa shfaqur sukses të rremë.
- Zhbërje e shpejtë edhe në iPhone, me kontroll të llogarisë, sezonit dhe episodit dhe pa prekur hyrje të tjera.
- Kalendar, profil, Home dhe inbox përditësohen pas shënimit; mosfunksionimi i një widget-i në Home nuk bllokon pjesët e tjera dhe ka buton Riprovo.
- Status i qartë ruajtjeje dhe rifreskimi; humbja e internetit raportohet si e tillë. Cloud provon sërish ruajtjen e ndryshimeve në pritje kur rikthehet lidhja; ato nuk mbishkruhen nga pull automatik.
- Njoftimet vazhdojnë të jenë brenda aplikacionit, jo Web Push në sfond.

## Episode & Franchise Hubs 10.8
- Franchise Hub brenda detajeve të anime-s: sezone/filma/speciale të organizuara si karta me progres dhe episodin e radhës. Tituj të veçantë me rrënjë të verifikuar të njëjtë lidhen vizualisht, pa ndryshuar ose fshirë regjistrimet e bibliotekës.
- Rifreskimi automatik i metadatave tani përditëson vetëm kartën aktuale; bashkimi i regjistrimeve të ndara bëhet vetëm nga komanda ekzistuese e shprehur “Bashko sezonet”. Nuk niset më bashkim automatik gjatë hyrjes.
- Episode Hub ruan përshkrimin/foton e verifikuar, shënimet private dhe komentet ekzistuese me mbulim spoiler; shton tab-e Episodi/Diskutimi dhe kalim të qartë te episodi para/pas edhe në sezonin tjetër kur është transmetuar.
- I njëjti progres për PC/iPhone, pa ndryshuar skemën Supabase apo krijuar databazë të re.

## Kalendari inteligjent 10.9
- “Kjo javë për ty” në PC dhe iPhone: episode të ardhshme nga anime që ndjek, pa ato tashmë të shënuara. Kufiri 7 ditë dhe zona kohore e pajisjes.
- Për çdo episod: pa kujtesë, në transmetim, 10/30/60 minuta ose 1 ditë përpara. Koha e zgjedhur ruhet në cloud dhe përfshihet në alarmet e eksportit .ics.
- Inbox-i llogarit fillimin e kujtesës sipas zgjedhjes reale, përfshirë 0 minuta. Aktivizimi është individual.
- Web Push për Home Screen iPhone është opt-in dhe i kushtëzuar nga serveri. Kodet SQL me RLS, Edge Functions dhe cron gjenden te `supabase/`, por **nuk janë aplikuar në projektin live**. Asnjë çelës privat nuk është në frontend.
- Për t’u publikuar: vendos në Supabase `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` dhe `ANIMETRACK_CRON_SECRET` (32+ karaktere); apliko migrimin; deploy `anime-push-config` me JWT dhe `anime-push-dispatch` pa JWT vetëm sepse kontrollon sekretin cron në kod; aktivizo cron sipas skedarit `supabase/cron/anime-push-109.sql`; kontrollo me një abonim test para ndezjes te përdoruesit.
- Deri në konfigurimin e serverit, UI shfaq saktësisht që Web Push nuk është aktiv dhe nuk kërkon leje njoftimesh.
- 10.8 Episode/Franchise, 10.7 ruajtja e sigurt dhe 10.6 PC ruhen të gjitha.

## Clean Series & My Lists 11.0
- Removed the Franchise Hub visual section, inferred linked-title cards, and duplicate season carousel entirely. Existing native season tabs and Episode Hub (next/previous episode, comments and spoiler controls) remain.
- Private named custom lists (12 lists, 150 anime each), created from Library → Listat e mia or from anime detail → Shto në listë. Users can add/remove anime without modifying watch history or status, rename/delete a list without deleting its anime.
- Lists are persisted in validated `customLists` preferences, including cloud sync. One-click optional share contains anime titles only; it never includes private notes, ratings, watch history or a private profile URL.
- The 10.9 smart airing calendar and staged Web Push backend remain unchanged; no additional database migrations and no Production deployment.

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

<!-- Production deployment sync: AnimeTrack 11.0 iPhone PWA release. -->

## Korrigjimi 10.5.1 në iPhone
- Feed-i i episodeve nuk fshihet më nga rregullat e vjetra të dashboard-it; vetëm pamja desktop fshihet në mobile.
- Test real shfletuesi për hapjen e feed-it, kalimin +1 episod dhe pesë tab-et në Chromium dhe Safari WebKit.
- Një rekord i paplotë episodi nuk e bllokon tërë aplikacionin; shfaqet veprim rikuperimi.

<!-- Production redeploy: AnimeTrack 11.0 iPhone blank-feed hotfix. -->
