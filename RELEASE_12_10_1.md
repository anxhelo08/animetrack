# AnimeTrack 12.10.1 — Release notes

Ky version përmbledh kërkesat për një katalog sezonal me dizajn modern dhe filtra sipas zhanrit, Anime Wrapped më të plotë me arritje dhe njohjen e episodeve filler.

## Çfarë ndryshon
- Katalogu sezonal përdor zhanret dhe tag-et reale të AniList (p.sh. Drama, Thriller, Isekai) me filtër kërkimi dhe kontrolle për formatin.
- Wrapped është rindërtuar me statistikë të episodeve të regjistruara në historik, periudha, anime kundrejt serialeve TV, imazh ndarjeje dhe arritje (p.sh. 10 episode në një ditë të datuar).
- Episode filler dhe recap dallohen vizualisht nga episodet e zakonshme. Filler shfaqet me të verdhë vetëm me dëshmi nga Jikan ose zgjedhje manuale; mosdisponueshmëria e metadata-ve mbetet Unknown.
- Datat/numrat e episodeve dhe shënimet personale ruhen; rifreskimi i klasifikimit nuk lëviz progresin.
- Ruajtja cloud dhe forma e listave nuk ndërpriten nga rifreskimet e metadata-ve.

## Kontrolli
`npm test`, Chromium desktop/iPhone, WebKit iPhone dhe rrjedha e autorizimit verifikohen nga GitHub Actions. Verifikimi i vendosjes në prodhim bëhet veçmas, pasi një `READY` preview nuk nënkupton se URL-ja kryesore ka kaluar në të njëjtin SHA.

## Burimi
Versioni i commit-it referencë: `3f35fab2b2928d77942a0a48e17500a3d914e369`. Dokumentacioni nuk përmban kredenciale ose të dhëna personale.
