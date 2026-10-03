export const PLAYER_HOSTS = [
  'www.crunchyroll.com',
  'www.netflix.com',
  'www.disneyplus.com',
  'www.primevideo.com',
];
export function playerURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      PLAYER_HOSTS.includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.origin + url.pathname
      : '';
  } catch {
    return '';
  }
}
export function playerTarget(payload, state) {
  if (
    !state.preferences?.playerTracking ||
    !Number.isFinite(payload?.playedRatio) ||
    payload.playedRatio < 0.9 ||
    payload.playedRatio > 1.1
  )
    return null;
  const url = playerURL(payload.url);
  if (!url) return null;
  const map = (state.preferences.playerMappings || []).find((row) => row.url === url);
  const anime = state.anime.find((row) => row.id === map?.animeId),
    season = anime?.seasons.find((row) => row.id === map?.seasonId);
  return map && season && !season.hidden && !season.watched.includes(map.episode)
    ? { anime, season, episode: map.episode }
    : null;
}
export function createPlayerTracking(ctx) {
  const esc = ctx.esc;
  function render() {
    const p = ctx.state().preferences || {},
      anime = ctx.state().anime || [];
    return `<section class="reading-panel"><h3>Gjurmim automatik nga player-i</h3><p>Shtesa për Chrome / Edge shënon episodin pasi të jetë luajtur të paktën 90% e videos në Crunchyroll, Netflix, Disney+ ose Prime Video. AnimeTrack duhet të jetë i hapur në një tab dhe titulli të jetë lidhur më poshtë.</p><p><a href="/integrations/animetrack-player.zip" download>Shkarko shtesën e player-it</a> · <a href="/integrations/player-guide.html" target="_blank" rel="noopener">Udhëzimi i instalimit</a></p><label><input type="checkbox" id="player-tracking-toggle" ${p.playerTracking ? 'checked' : ''}> Aktivizo shënimin automatik në këtë llogari</label><form id="player-mapping-form" class="reading-form-grid"><label class="reading-field reading-wide">URL e episodit / filmit<input name="url" type="url" required placeholder="https://www.crunchyroll.com/watch/…" maxlength="2000"></label><label class="reading-field">Pjesa në bibliotekë<select name="playerTarget">${anime.flatMap((a) => (a.seasons || []).filter((s) => !s.hidden).map((s) => `<option value="${esc(a.id)}|${esc(s.id)}">${esc(a.title)} · ${esc(s.subtitle || s.title)}</option>`)).join('')}</select></label><label class="reading-field">Numri i episodit<input name="episode" type="number" min="1" max="10000" required value="1"></label><button class="primary" ${anime.length ? '' : 'disabled'}>Lidh këtë video</button></form><div>${(p.playerMappings || []).map((map, index) => `<p>${esc(anime.find((a) => a.id === map.animeId)?.title || 'Titull i hequr')} · EP ${map.episode}<small> · ${esc(map.url)}</small> <button type="button" class="ghost" data-player-remove="${index}">Hiq lidhjen</button></p>`).join('')}</div><p class="reading-volume-note">Shtesa dërgon vetëm adresën e videos dhe raportin e kohës së luajtur në tab-in AnimeTrack. Nuk merr token të llogarisë. Nuk funksionon për player-a që fshehin videon në iframe të një burimi tjetër.</p></section>`;
  }
  function save(change) {
    const state = ctx.state(),
      before = structuredClone(state.preferences || {});
    state.preferences ||= {};
    change(state.preferences);
    if (!ctx.save()) {
      state.preferences = before;
      return false;
    }
    ctx.rerender(true);
    return true;
  }
  function mount() {
    document.addEventListener('change', (event) => {
      if (event.target.id === 'player-tracking-toggle')
        save((p) => (p.playerTracking = event.target.checked));
    });
    document.addEventListener('submit', (event) => {
      if (event.target.id !== 'player-mapping-form') return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target)),
        url = playerURL(data.url),
        [animeId, seasonId] = String(data.playerTarget).split('|'),
        episode = Number(data.episode);
      const a = ctx.state().anime.find((a) => a.id === animeId),
        s = a?.seasons.find((s) => s.id === seasonId);
      if (!url || !s || !Number.isInteger(episode) || episode < 1 || episode > ctx.released(s)) {
        ctx.toast('Përdor një URL të player-it të mbështetur dhe një episod të publikuar.');
        return;
      }
      if ((ctx.state().preferences?.playerMappings || []).length >= 100) {
        ctx.toast('Kufiri është 100 lidhje video.');
        return;
      }
      if (
        save((p) => {
          p.playerMappings = [
            ...(p.playerMappings || []).filter((row) => row.url !== url),
            { url, animeId, seasonId, episode },
          ];
        })
      )
        ctx.toast('Videoja u lidh ✓');
    });
    document.addEventListener('click', (event) => {
      const b = event.target.closest('[data-player-remove]');
      if (b)
        save(
          (p) =>
            (p.playerMappings = (p.playerMappings || []).filter(
              (_, index) => index !== Number(b.dataset.playerRemove),
            )),
        );
    });
    document.addEventListener('animetrack-player-progress', (event) => {
      const target = playerTarget(event.detail, ctx.state());
      if (!target || target.episode > ctx.released(target.season)) return;
      ctx.markPlayedEpisode(target.anime.id, target.season.id, target.episode);
    });
  }
  return { render, mount };
}
