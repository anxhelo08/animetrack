# AnimeTrack 13.0.0 — Online-first Performance

## Çfarë ndryshon

- Cloud sync tani përdor payload compact dhe Supabase mbetet kopja kanonike për llogarinë.
- Payload-i aktual i bibliotekës së testuar bie nga rreth 3.07 MB në rreth 0.5 MB, duke hyrë nën kufirin 1 MB të Postgres Changes.
- Save queue kalon nga 1100 ms në 120 ms.
- Kur Realtime përmban payload-in e plotë, PC/iPhone e aplikojnë direkt pa një pull REST të dytë.
- Rich metadata lokale ruhet gjatë sync; state-i personal nga cloud është autoritativ.
- Versionet 12.x mbeten të lexueshme dhe konvertohen në formatin compact pas shkrimit të parë nga 13.0.

## Performance / PWA

- Script-et janë `defer` për të mos bllokuar parsing-un e faqes.
- Preconnect për Supabase dhe jsDelivr.
- Service Worker cache version `animetrack-shell-v1300-1`.
- Install-i i PWA përdor precache tolerant: një asset opsional që dështon nuk rrëzon gjithë instalimin.

## Siguria e të dhënave

- Offline recovery journal dhe CAS me `updated_at` mbeten aktive.
- Nuk ka service-role key në frontend.
- RLS ekzistuese e `anime_libraries` vazhdon të ndajë bibliotekat sipas llogarisë.
- Nuk kërkohet tabelë e re ose migrim skeme.
