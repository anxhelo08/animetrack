# Loti i dytë: biblioteka dhe detajet

Përditësim mbi `d27455d`, pas analizës mobile dhe korrigjimeve të lotit të parë.

## Ndryshimet

- “Aktive / Në plan” shfaqen pranë njëra-tjetrës, me numrat e titujve, edhe në 320px. Aktive mbetet pamja fillestare. Statuset personale janë te filtrat; kategoritë ekzistuese ruajnë kuptimin e tyre dhe filtrat aktivë shfaqen pranë rezultateve.
- “Filtra dhe renditje” dhe “Mjetet e bibliotekës” janë dy seksione të pavarura. Importi AniList/MAL dhe riparimi i sezoneve përdorin të njëjtët elementë dhe event handlers, të zhvendosur te mjetet.
- Në telefon, zgjedhja e një skede detajesh zvogëlon hero-n dhe vendos skedat pranë përmbajtjes. Butoni i kopertinës lejon hapjen e plotë përsëri. Kopertina nuk hiqet nga identiteti i titullit.
- Shënimet hapen me editorin dhe ruajtjen e drejtpërdrejtë, përpara vlerësimeve. I njëjti kontrollues përdoret në desktop dhe telefon. Drafti ruhet gjatë kalimit të skedave/rivizatimit të sezonit për titullin aktual. Shikimi përsëri zhvendoset te episodet; filmat ruajnë veprimet e tyre të shikimit dhe editorin ekzistues të shënimeve.
- Ruajtja e shënimit kontrollon titullin/pronarin aktual, rikthen të dhënat kur save dështon dhe ndalon mbishkrimin kur versioni i ruajtur ka ndryshuar ndërkohë. Në konflikt ofrohet ngarkim i qartë i versionit të ruajtur. Draftet janë në memorie, jo rikuperim pas mbylljes së plotë pa ruajtur.

Nuk u ndryshuan skema e bibliotekës, CSP, databaza, ruajtja e progresit apo rendi i historikut. Nuk u shtuan varësi.

## Verifikimi

Provat e sjelljes kontrollojnë dy destinacionet pa scroll horizontal, ndarjen e mjeteve, ruajtjen e filtrave/handlers, editorin si përmbajtje të parë, kompaktimin/rikthimin e kopertinës, draftin gjatë kalimit të sezonit, save dhe reload, filmat, rikthimin pas dështimit, konfliktet dhe izolimin e llogarisë.

Kaluan typecheck, lint, format:check, 668 teste unitare dhe build. Paketa e regresionit mbuloi 24 raste të aplikueshme në Chromium desktop/mobile; 10 kombinime vetëm për pajisjen tjetër u anashkaluan. U konfirmuan veçmas gjashtë prova të pamjes/shënimeve/temës së çelët dhe dy prova të redaktimit manual të progresit pas përshtatjes së testit me hyrjen te Përmbledhja.

JavaScript fillestar: 302,072/305,000 bytes gzip; total: 363,836/364,500. Kufijtë nuk u rritën.

Provat përdorin Chromium desktop/mobile dhe përgjigje të simuluara, jo bibliotekën reale të përdoruesit. Safari fizik, VoiceOver dhe tastiera reale iOS nuk u testuan.
