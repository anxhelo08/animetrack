# Referenca për përvojën e telefonit

Përparësia e konfirmuar nga përdoruesi është shpejtësia dhe reagimi. Referencat më poshtë mbështesin vendimet e ndërfaqes; listat e veçorive nuk provojnë që një aplikacion tjetër është më i shpejtë se AnimeTrack.

| Burimi zyrtar                                                                                           | Çfarë ndihmon këtë përditësim                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Letterboxd FAQ](https://letterboxd.com/about/faq/)                                                     | Shënimi si i parë dhe ditari janë veprime të dallueshme; veprimi i shpejtë nuk duhet të kërkojë plotësimin e shënimeve.                                             |
| [Trakt për Android](https://play.google.com/store/apps/details?id=tv.trakt.trakt)                       | Episodi i radhës, progresi dhe kalendari personal janë destinacione kryesore.                                                                                       |
| [Serializd](https://www.serializd.com/)                                                                 | Ndjekja, ditari, vlerësimet dhe zbulimi kanë qëllime të dallueshme.                                                                                                 |
| [JustWatch në telefon](https://www.justwatch.com/us/apps)                                               | Zbulimi dhe lista personale organizohen veçmas.                                                                                                                     |
| [IMDb Watchlist FAQ](https://help.imdb.com/article/imdb/track-movies-tv/watchlist-faq/G9PA556494DM8YBA) | Renditja dhe menaxhimi i listës duhet të mbeten të arritshme pa mbushur çdo ekran me kontrolle.                                                                     |
| [Apple: kërkimi intuitiv](https://developer.apple.com/videos/play/wwdc2026/292/)                        | Fusha, pastrimi i tekstit dhe shtrirja e kërkimit duhet të jenë të kuptueshme.                                                                                      |
| [W3C: madhësia e objektivave](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)     | Synojmë 44 px për veprimet kryesore në telefon; minimumi WCAG AA është 24 px me përjashtime.                                                                        |
| [web.dev: optimizimi i INP](https://web.dev/articles/optimize-inp)                                      | Punë më e shkurtër për ndërveprim, DOM më i vogël dhe shtyrje e punës së panevojshme.                                                                               |
| [web.dev: content-visibility](https://web.dev/articles/content-visibility)                              | Përmbajtja jashtë ekranit mund të shmangë punë renderimi; leximi i përmasave mund ta anulojë këtë përfitim. Këtu u zgjodh ngarkimi me grupe, me kontrolle të qarta. |
| [web.dev: ngarkimi i imazheve](https://web.dev/articles/browser-level-image-lazy-loading)               | Imazhet jashtë ekranit ngarkohen sipas nevojës; vendi i tyre ruhet nga përmasat e mbështjellësit.                                                                   |

TV Time u kontrollua si referencë historike. Faqja e tij kryesore aktualisht paraqet një mesazh përfundimi; nuk përdoret si provë e një produkti aktual funksional.

Vendimet e zbatuara: episodi i radhës përpara historikut; 20 tituj fillestarë për grup me “Shfaq më shumë”; renderime të bashkuara në një kuadër; asnjë rindërtim i listës së vjetër të fshehur pas +1; kthim te pozicioni i mëparshëm; kontrolle të etiketuara në shqip; status sinkronizimi që nuk mbulon përmbajtjen. Identiteti ekzistues i errët/vjollcë ruhet.

Matjet përdorin një bibliotekë të njëjtë me 500 tituj dhe Chromium me ngadalësim CPU 4×. Ato shërbejnë për krahasim laboratorik; nuk janë matje të INP në prodhim apo test fizik i Safari-t. Vlerat përfundimtare dhe kontrollet regjistrohen te përditësimi 14.28.0.
