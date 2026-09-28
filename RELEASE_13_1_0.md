# AnimeTrack 13.1.0 — Franchise Timeline 2.0

## Franchise Timeline 2.0
- Sezonet, filmat, OVA-t dhe specialet shfaqen në një timeline horizontal në rend publikimi.
- Çdo pjesë ka progresin, datën, score-in e komunitetit dhe rating-un personal në të njëjtën kartë.
- Përmbledhja llogarit mesataren e pjesëve të vlerësuara dhe nxjerr pjesën më të vlerësuar.

## Story Arc ratings
- Çdo sezon mund të ndahet manualisht në story arcs me emër dhe interval episodesh.
- Çdo arc ka rating personal 0.5–10.
- Arc-et mund të modifikohen, fshihen dhe hapen direkt te episodi i parë i intervalit.
- Shënimet e shkurtra ruhen bashkë me arc-un.

## Cloud / compatibility
- `arcRatings` ruhet në payload-in compact 13.x të Supabase.
- PC ↔ mobile Realtime vazhdon të përdorë payload-in compact.
- Rindërtimi i TV franchise ruan `myRating` dhe `arcRatings`.
- Nuk kërkohet migrim i databazës; të dhënat janë brenda payload-it ekzistues.
