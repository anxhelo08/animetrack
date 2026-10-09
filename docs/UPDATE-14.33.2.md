# Hapja e kërkimit në telefon — 14.33.2

- Paneli i vjetër `at117-mobile-discover`, i fshehur nga CSS në pamjen moderne të telefonit, nuk ndërtohet gjatë hapjes së kërkimit ose rifreskimeve të sugjerimeve.
- Hapja e faqes dhe fokusimi i fushës kryhen para punës së sugjerimeve, të planifikuar pas kornizës së parë të shfaqjes. Puna anulohet nëse përdoruesi ka kaluar në një seksion tjetër.
- Një katalog i ngarkuar tashmë nga cache për të njëjtën ditë nuk renditet/pikturohet përsëri në çdo hapje. Ndryshimi i bibliotekës, i llogarisë, një cache i ri ose rifreskimi i detyruar ruajnë përditësimin normal.
- Nuk ndryshon CSP, host-et, forma e bibliotekës, rendi i episodeve apo fokusi fillestar te radha e shikimit.

Testet e reja kontrollojnë shmangien e renditjes së përsëritur dhe invalidimin sipas bibliotekës/llogarisë. Prova e telefonit mat hapjen nga butoni i kërkimit dhe nga navigimi, me 500 tituj, CPU 4× dhe përgjigje katalogu në pritje; fusha duhet të jetë e dukshme dhe të pranojë tekst pa pritur burimet. Paneli i fshehur nuk duhet të ndryshojë DOM gjatë kësaj rrjedhe.

Supozim: problemi është vonesa e hapjes së pamjes së kërkimit, jo koha e kthimit të rezultateve nga burimet. Matjet janë laboratorike në Chromium me përmasa telefoni; Safari fizik nuk është verifikuar.

## Rezultatet

Kaluan typecheck, lint, format:check, npm test, build dhe test:performance. 620 teste unit në 90 skedarë. 10 prova të telefonit kaluan, përfshirë hapjen e kërkimit, filtrimin, ndjekjen e episodeve, hapjen te radha e shikimit dhe rendin e historikut. Hapja e matur me CPU 4×: 308 ms nga butoni i kërkimit dhe 42 ms nga navigimi; këto nuk janë matje nga telefoni fizik i përdoruesit.

Buxheti gzip: 307016/310000 B në nisje dhe 345616/346000 B gjithsej. Asnjë limit nuk u rrit.

Kaluan edhe 12 prova të katalogut në desktop/telefon (2 raste u anashkaluan sipas platformës), përfshirë kërkimin pa autofill emaili, rezultatet nga burime të shumta, ruajtjen e kartave, faqëzimin dhe hedhjen poshtë të përgjigjeve të vjetra. Gjithsej 22 prova shfletuesi kaluan në këtë verifikim.
