# AnimeTrack 13.9.0 — kandidat për shqyrtim

Ndryshimet e përfshira:

- Baseline i skemave të aplikacionit, tabelave, policy-ve, grant-eve, funksioneve dhe trigger-ave; pa të dhëna përdoruesish.
- API-të Cinemeta/MAL si ESM, validim kërkesash, timeout, bllokim redirects dhe rate limit lokal + kuotë globale atomike në databazë. Kuota anonime globale mund të konsumohet nga klientë publikë; për mbrojtje më të fortë ndaj abuzimit nevojitet verifikim identiteti ose firewall.
- Rate limit për kërkimin/ftesat e miqve, përgjigje uniforme për ftesa dhe fshehje e refuzimeve nga dërguesi.
- Kredenciale AniList/MAL të enkriptuara në server dhe veprime të kufizuara të provider-ave; asnjë token afatgjatë nuk ruhet më në localStorage.
- Eksport i të dhënave të llogarisë dhe fshirje me konfirmim + riautentikim. RLS kontrollon sesionin aktiv edhe pas revokimit/fshirjes.
- Teste sjelljeje për API, vault, identitetin e llogarisë dhe kontrollet e serverit; CI me rikrijim PostgreSQL dhe lint.

Verifikime të kryera:

- 298 teste të logjikës kaluan.
- ESLint, kontrollet e formatimit dhe build-i Vite kaluan.
- Migrimi u ekzekutua brenda një transaksioni që u kthye mbrapsht; leximi/shkrimi mes llogarive, aksesi te kredencialet dhe sesioni i revokuar u provuan me identitete testimi. Nuk u ruajtën ndryshime ose rreshta testimi në prodhim.

Kufizime dhe punë e mbetur para një release-i përfundimtar:

- Publikimi në GitHub/preview/production kërkon miratim të ri: kontrolli automatik e refuzoi dërgimin në repo-n publike.
- Playwright nuk mund të nisej lokalisht; shkarkimi i Chromium/WebKit dështoi. Kontrollet desktop/iPhone dhe rikrijimi i databazës në CI mbeten për t'u kryer pas miratimit të publikimit.
- `anime-account` dhe migrimi i ri ende nuk janë aktivizuar në prodhim. Ato duhen zbatuar dhe verifikuar përpara kalimit të frontend-it në live.
- AniList ende përdor implicit OAuth për marrjen fillestare të token-it, që më pas transferohet në server. Rrjedha authorization-code vetëm në server kërkon Client ID/Client Secret të konfiguruar dhe nuk është përfunduar në këtë kandidat. Mos e paraqit si OAuth plotësisht server-side.
- Backup/PITR nuk është aktivizuar ose verifikuar. Mos pretendo një provë restore të backup-it të prodhimit; prova në CI është për rikrijimin e skemës nga baseline-i.

Versioni i fundit i konfirmuar live mbetet 13.8.0.
