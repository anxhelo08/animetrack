# Njoftimet push — 13.10

## Dërgimi

Një punë merret me lease atomik dhe `SKIP LOCKED`; vetëm shërbimi mund të ndryshojë attempts/lease/status. Deri në 8 kujtesa për thirrje; lexime të bibliotekës dhe abonimeve të grupuara sipas përdoruesit, 4 punë dhe deri në 20 endpoint-e njëkohësisht. Timeout rrjeti 10 sekonda.

Çdo pajisje ka status të veçantë. Një pajisje që pranoi njoftimin nuk ridërgohet kur një tjetër dështon. 404/410 fshijnë abonimin e skaduar. 408/429/5xx dhe gabimet e rrjetit riprovohen deri në 5 përpjekje, me intervale 5, 10, 20, 40 minuta; `Retry-After` respektohet deri në një orë. Gabimet e tjera HTTP ndalen. Lease i braktisur rikuperohet pas 5 minutash; kujtesat më shumë se 24 orë të vonuara skadojnë.

Nëse procesi ndërpritet pasi provider-i e pranoi njoftimin, por para ruajtjes së suksesit, mund të ketë ridërgim. Ky është dërgim *at least once*, jo garanci *exactly once*. Tag-u i njëjtë kufizon kartat e dyfishta në pajisje. Pranimi nga provider-i nuk garanton shfaqjen në OS; Focus/Do Not Disturb dhe lejet mbeten nën kontrollin e pajisjes.

Endpoint-et lejohen vetëm me HTTPS/port 443, pa kredenciale ose fragment: FCM, Mozilla, *.push.apple.com dhe *.notify.windows.com (Windows/Edge), me kufi domeni të saktë.

## Konfigurimi

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: çift ekzistues VAPID; mos e ndrysho pa rilidhur abonimet.
- `VAPID_SUBJECT`: mailto kontakt ose HTTPS publik. Për instalimet ekzistuese, vlera rezervë është `https://animetrack-flax.vercel.app`; konfigurimi env ka përparësi. Çelësat privatë nuk dalin në API.
- Dispatcher: `verify_jwt=false` sepse autentikon `X-Cron-Secret`. Pranon sekretin ekzistues env ose sekretin e scheduler-it nga Vault përmes RPC vetëm për service-role. Nuk është endpoint publik për dërgim.
- Config: `verify_jwt=true` dhe kontroll i përdoruesit/sesionit aktiv në handler. OPTIONS është preflight; POST kërkon sesion të vlefshëm, kthen vetëm `{enabled:true,publicKey}`. 401 për sesion të pavlefshëm; 503 `{enabled:false,reason:'not_configured'}` për mungesë VAPID; 405 për metoda të tjera; `Cache-Control:no-store`.

Migrimi i radhës aktivizohet para worker-it dhe frontend-it. Scheduler-i i prodhimit përdor Vault, pg_cron dhe pg_net çdo 5 minuta; skripti është `supabase/cron/anime-push-1310.sql`. Sekreti gjenerohet brenda databazës dhe nuk përfshihet në source/ZIP. Leja e pajisjes kërkohet vetëm nga butoni i përdoruesit.

Testet përdorin provider-a sintetikë dhe databazë të përkohshme; nuk dërgojnë njoftime te abonimet e përdoruesve. Prova reale në Windows/iPhone kërkon një pajisje të regjistruar me leje të dhënë.
