export const STATUS = {
  watching: 'Po shikoj',
  completed: 'Përfunduar',
  planning: 'Në listë',
  paused: 'Në pauzë',
  dropped: 'E lënë',
};

/** Creates the library model with explicit release and arc providers. */
export function createLibraryModel(dependencies = {}) {
  function validPoster(s) {
    try {
      const u = new URL(s);
      return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
    } catch {
      return '';
    }
  }

  function uuid() {
    return globalThis.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 'anime-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function now() {
    return new Date().toISOString();
  }

  function genresOf(a) {
    return [
      ...new Set(
        String(a?.genre || '')
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean)
          .map((g) => g.slice(0, 55)),
      ),
    ];
  }

  function mediaFormat(value) {
    const raw = String(value || 'TV')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    if (raw === 'FILM' || raw === 'MOVIE') return 'MOVIE';
    if (raw === 'TV_SPECIAL') return 'SPECIAL';
    return raw || 'TV';
  }

  function isMovieAnime(a) {
    return (
      mediaFormat(a?.format) === 'MOVIE' ||
      (Array.isArray(a?.seasons) &&
        a.seasons.length === 1 &&
        mediaFormat(a.seasons[0]?.format) === 'MOVIE')
    );
  }

  function isLiveMovie(a) {
    return (
      mediaFormat(a?.format) === 'MOVIE' &&
      ['TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(String(a?.source || ''))
    );
  }

  function mediaKind(a) {
    return isLiveMovie(a) ? 'movie' : a?.source === 'TVMaze' ? 'tv' : 'anime';
  }

  function movieWatched(a) {
    return !!(isLiveMovie(a) && visibleSeasons(a)[0]?.watched?.includes(1));
  }

  function isConfirmedFutureSeason(s) {
    return (
      !!s &&
      ['TV', 'TV_SHORT', 'ONA'].includes(mediaFormat(s.format)) &&
      String(s.releaseStatus || '').toUpperCase() === 'NOT_YET_RELEASED'
    );
  }

  function visibleSeasons(a) {
    return (a?.seasons || []).filter((s) => !s.hidden);
  }

  function hiddenSeasons(a) {
    return (a?.seasons || []).filter((s) => s.hidden);
  }

  function futureSeasonOf(a) {
    if (a?.status !== 'completed') return null;
    const parts = visibleSeasons(a);
    return (
      parts.find(isConfirmedFutureSeason) ||
      (a.source === 'TVMaze'
        ? parts.find((s) =>
            (s.episodes || []).some((e) => e.airedAt && Date.parse(e.airedAt) > Date.now()),
          )
        : null)
    );
  }

  function tidyNums(values, total = 0) {
    return [
      ...new Set(
        (Array.isArray(values) ? values : [])
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0 && n <= 10000 && (!total || n <= total)),
      ),
    ].sort((a, b) => a - b);
  }

  function normSeason(raw, idx = 0) {
    const total = Math.max(0, Math.min(10000, parseInt(raw?.total, 10) || 0));
    return {
      id: String(raw?.id || 'manual-' + (idx + 1)).slice(0, 65),
      title: String(raw?.title || 'Sezoni ' + (idx + 1)).slice(0, 180),
      subtitle: String(raw?.subtitle || '').slice(0, 180),
      aliases: [
        ...new Set(
          (Array.isArray(raw?.aliases) ? raw.aliases : [])
            .map((x) =>
              String(x || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 180),
            )
            .filter(Boolean),
        ),
      ].slice(0, 12),
      total,
      watched: tidyNums(raw?.watched, total),
      year: Number(raw?.year) || null,
      source: String(raw?.source || '').slice(0, 20),
      sourceId: String(raw?.sourceId || '').slice(0, 30),
      malId: String(raw?.malId || '').slice(0, 30),
      format: mediaFormat(raw?.format || 'TV'),
      globalStart: Math.max(0, Number(raw?.globalStart) || 0),
      episodes: (Array.isArray(raw?.episodes) ? raw.episodes : [])
        .filter((e) => e && Number.isInteger(Number(e.number)) && Number(e.number) > 0)
        .slice(0, 10000)
        .map((e) => ({
          number: Number(e.number),
          absolute: Number(e.absolute) || 0,
          title: String(e.title || '').slice(0, 220),
          aired: String(e.aired || '').slice(0, 40),
          airedAt: String(e.airedAt || '').slice(0, 60),
          summary: String(e.summary || '').slice(0, 2500),
          image: validPoster(e.image || ''),
          url: validPoster(e.url || ''),
          tvmazeEpisodeId: String(e.tvmazeEpisodeId || '').slice(0, 30),
          filler: !!e.filler,
          recap: !!e.recap,
          fillerChecked: e.fillerChecked === true,
          fillerSource: String(e.fillerSource || '').slice(0, 18),
          fillerCheckedAt: String(e.fillerCheckedAt || '').slice(0, 40),
          fillerManual: e.fillerManual === true ? true : e.fillerManual === false ? false : null,
          detailsCheckedAt: String(e.detailsCheckedAt || '').slice(0, 40),
          myNote: String(e.myNote || '').slice(0, 1500),
          personalRating:
            e.personalRating == null
              ? null
              : Math.max(1, Math.min(10, Number(e.personalRating) || 1)),
        })),
      loadedPages: [
        ...new Set(
          (Array.isArray(raw?.loadedPages) ? raw.loadedPages : []).filter(
            (n) => Number.isInteger(n) && n > 0 && n <= 500,
          ),
        ),
      ],
      fillerPagesChecked: [
        ...new Set(
          (Array.isArray(raw?.fillerPagesChecked) ? raw.fillerPagesChecked : []).filter(
            (n) => Number.isInteger(n) && n > 0 && n <= 500,
          ),
        ),
      ],
      epPage: Math.max(0, Math.min(500, parseInt(raw?.epPage, 10) || 0)),
      hasMore: !!raw?.hasMore,
      myRating:
        raw?.myRating == null || raw.myRating === ''
          ? null
          : Math.min(10, Math.max(0, Number(raw.myRating) || 0)),
      arcRatings: (Array.isArray(raw?.arcRatings) ? raw.arcRatings : [])
        .slice(0, 80)
        .map((arc, i) => (dependencies.normalizeArc ? dependencies.normalizeArc(arc, i) : arc)),
      communityScore:
        Number.isFinite(Number(raw?.communityScore)) && raw?.communityScore != null
          ? Math.max(0, Math.min(100, Number(raw.communityScore)))
          : null,
      communitySource: String(raw?.communitySource || '').slice(0, 25),
      discoveredAt: String(raw?.discoveredAt || '').slice(0, 40),
      releaseStatus: String(raw?.releaseStatus || '').slice(0, 32),
      releaseStart: String(raw?.releaseStart || '').slice(0, 32),
      nextAiringAt: Math.max(0, Number(raw?.nextAiringAt) || 0),
      nextAiringEpisode: Math.max(0, Number(raw?.nextAiringEpisode) || 0),
      airedCount: raw?.airedCount == null ? null : Math.max(0, Number(raw.airedCount) || 0),
      airedCheckedAt: String(raw?.airedCheckedAt || '').slice(0, 40),
      imdbId: /^tt\d{5,12}$/.test(String(raw?.imdbId || '')) ? String(raw.imdbId) : '',
      imdbSeasonNumber: Math.max(1, Math.min(200, Number(raw?.imdbSeasonNumber) || idx + 1)),
      imdbEpisodeAverage:
        raw?.imdbEpisodeAverage == null
          ? null
          : Number.isFinite(Number(raw.imdbEpisodeAverage))
            ? Math.max(0, Math.min(10, Number(raw.imdbEpisodeAverage)))
            : null,
      imdbEpisodeCount: Math.max(0, Number(raw?.imdbEpisodeCount) || 0),
      imdbCheckedAt: String(raw?.imdbCheckedAt || '').slice(0, 40),
      hidden: raw?.hidden === true,
      synopsis: String(raw?.synopsis || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1800),
      sourceUrl: validPoster(raw?.sourceUrl || ''),
    };
  }

  function mediaStartIso(d) {
    if (!d?.year) return '';
    return [
      String(d.year),
      String(d.month || 1).padStart(2, '0'),
      String(d.day || 1).padStart(2, '0'),
    ].join('-');
  }

  function releaseFromMedia(s, m) {
    if (!s || !m) return;
    if (String(s.source || '').toLowerCase() === 'tvmaze') return;
    if (m.status) s.releaseStatus = String(m.status).toUpperCase().replace(/\s+/g, '_');
    if (m.startDate?.year) s.releaseStart = mediaStartIso(m.startDate);
    const next = m.nextAiringEpisode;
    if (next?.episode && next?.airingAt) {
      s.nextAiringEpisode = Math.max(0, Number(next.episode) || 0);
      s.nextAiringAt = Math.max(0, Number(next.airingAt) || 0);
      s.airedCount = Math.max(
        0,
        s.nextAiringEpisode - (Date.now() < s.nextAiringAt * 1000 ? 1 : 0),
      );
    } else if (s.releaseStatus === 'FINISHED' || s.releaseStatus === 'FINISHED_AIRING') {
      s.airedCount = Math.max(0, Number(m.episodes) || s.total || 0);
      s.nextAiringEpisode = 0;
      s.nextAiringAt = 0;
    } else if (s.releaseStatus === 'NOT_YET_RELEASED' || s.releaseStatus === 'NOT_YET_AIRED') {
      s.airedCount = 0;
      s.nextAiringEpisode = 0;
      s.nextAiringAt = 0;
    } else if (s.releaseStatus === 'RELEASING') {
      s.nextAiringEpisode = 0;
      s.nextAiringAt = 0;
    }
    s.airedCheckedAt = now();
  }

  function releasedCount(s, at = Date.now()) {
    const maxWatched = Math.max(0, ...(s?.watched || []));
    if (!s) return 0;
    const total = Math.max(0, Number(s.total) || 0),
      status = String(s.releaseStatus || '').toUpperCase();
    const tvmazeGuard = dependencies.releasedTV?.(s, at);
    if (tvmazeGuard != null) return tvmazeGuard;
    if (s.releaseStart && Date.parse(s.releaseStart + 'T00:00:00Z') > at && maxWatched === 0)
      return 0;
    if (['NOT_YET_RELEASED', 'NOT_YET_AIRED'].includes(status)) return maxWatched;
    if (['FINISHED', 'FINISHED_AIRING'].includes(status)) return Math.max(maxWatched, total);
    let confirmed = Math.max(0, Number(s.airedCount) || 0);
    if (s.nextAiringEpisode && s.nextAiringAt) {
      confirmed = Math.max(
        0,
        Number(s.nextAiringEpisode) - (at < Number(s.nextAiringAt) * 1000 ? 1 : 0),
      );
    }
    // Episode-by-episode dates are useful when Jikan has not supplied an AniList schedule.
    for (const ep of s.episodes || []) {
      const ts = Date.parse(ep.airedAt || ep.aired || '');
      if (Number.isFinite(ts) && ts <= at) confirmed = Math.max(confirmed, Number(ep.number) || 0);
    }
    if (['RELEASING', 'CURRENTLY_AIRING', 'HIATUS', 'CANCELLED'].includes(status))
      return Math.max(maxWatched, Math.min(total || 10000, confirmed));
    if (s.airedCount != null || s.nextAiringAt)
      return Math.max(maxWatched, Math.min(total || 10000, confirmed));
    if (Number(s.year) > new Date(at).getUTCFullYear() && maxWatched === 0) return 0;
    // Legacy / manually entered anime remain usable until online metadata arrives.
    return Math.max(maxWatched, total);
  }

  function releasedTotal(a) {
    return visibleSeasons(a).reduce((sum, s) => sum + releasedCount(s), 0);
  }

  function plannedPending(a) {
    return visibleSeasons(a).reduce(
      (sum, s) => sum + Math.max(0, (Number(s.total) || 0) - releasedCount(s)),
      0,
    );
  }

  function pendingReleaseText(s) {
    let date = s.nextAiringAt ? new Date(s.nextAiringAt * 1000) : null;
    let when =
      date && Number.isFinite(date.getTime())
        ? ' · ' +
          new Intl.DateTimeFormat('sq-AL', {
            timeZone: 'Europe/Tirane',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }).format(date)
        : '';
    return `E konfirmuar · ${s.total ? Math.max(0, s.total - releasedCount(s)) + ' ep. ende pa dalë' : 'numri i episodeve ende i panjohur'}${when || (s.releaseStart && s.releaseStart.length >= 10 ? ' · Fillimi: ' + s.releaseStart : '')}`;
  }

  function releasedStatusAfterWatch(a, seen) {
    const available = releasedTotal(a),
      future = visibleSeasons(a).some(
        (s) =>
          (Number(s.total) || 0) > releasedCount(s) ||
          (['RELEASING', 'CURRENTLY_AIRING', 'NOT_YET_RELEASED', 'NOT_YET_AIRED'].includes(
            s.releaseStatus,
          ) &&
            !!s.nextAiringAt),
      );
    if (available > 0 && count(a) >= available) a.status = future ? 'watching' : 'completed';
    else if (['completed', 'waiting'].includes(a.status) && count(a) < available)
      a.status = 'watching';
    else if (seen && a.status === 'planning') a.status = 'watching';
  }

  function syncTotals(a) {
    a.seasons = (Array.isArray(a.seasons) ? a.seasons : []).map(normSeason).slice(0, 200);
    const parts = visibleSeasons(a),
      allKnown = parts.length > 0 && parts.every((s) => s.total > 0);
    a.total = allKnown ? parts.reduce((sum, s) => sum + s.total, 0) : 0;
    let offset = 0;
    const flat = [];
    for (const season of parts) {
      for (const n of season.watched) {
        const absolute = season.globalStart ? season.globalStart + n - 1 : offset + n;
        if (absolute > 0 && absolute <= 10000) flat.push(absolute);
      }
      offset += season.total || Math.max(0, ...season.watched);
    }
    a.watched = tidyNums(flat);
    return a;
  }

  function normalized(a) {
    if (!a || typeof a !== 'object' || typeof a.title !== 'string' || !a.title.trim()) return null;
    const oldTotal = Math.max(0, Math.min(10000, parseInt(a.total, 10) || 0));
    const seed = {
      id:
        a.source === 'AniList' && a.sourceId
          ? 'al-' + a.sourceId
          : a.source === 'MyAnimeList' && a.sourceId
            ? 'mal-' + a.sourceId
            : 'manual-1',
      title: 'Sezoni 1',
      subtitle: a.title,
      total: oldTotal,
      watched: tidyNums(a.watched, oldTotal),
      source: a.source || '',
      sourceId: a.sourceId || '',
      malId: a.malId || '',
      format: a.format || 'TV',
      episodes: [],
      myRating: null,
      communityScore: null,
    };
    let o = {
      id: String(a.id || uuid()),
      title: String(a.title).trim().slice(0, 180),
      status: STATUS[a.status] ? a.status : 'planning',
      total: oldTotal,
      watched: [],
      rating:
        a.rating === '' || a.rating == null
          ? null
          : Math.min(10, Math.max(0, Number(a.rating) || 0)),
      year: Number.isInteger(+a.year) && +a.year >= 1950 && +a.year <= 2200 ? +a.year : null,
      genre: String(a.genre || '').slice(0, 120),
      cover: validPoster(a.cover || ''),
      notes: String(a.notes || '').slice(0, 2500),
      favorite: !!a.favorite,
      communityScore:
        a.communityScore == null ? null : Math.max(0, Math.min(100, Number(a.communityScore) || 0)),
      communitySource: String(a.communitySource || '').slice(0, 25),
      source: ['AniList', 'MyAnimeList', 'TVMaze', 'TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(
        a.source,
      )
        ? a.source
        : '',
      sourceId: String(a.sourceId || '').slice(0, 30),
      aliases: [
        ...new Set((Array.isArray(a.aliases) ? a.aliases : []).map((x) => String(x).slice(0, 180))),
      ].slice(0, 40),
      mergedIds: [
        ...new Set(
          (Array.isArray(a.mergedIds) ? a.mergedIds : []).map((x) => String(x).slice(0, 180)),
        ),
      ].slice(0, 200),
      providerIds: [
        ...new Set(
          (Array.isArray(a.providerIds) ? a.providerIds : []).map((x) => String(x).slice(0, 180)),
        ),
      ].slice(0, 500),
      malId: String(a.malId || '').slice(0, 30),
      format: mediaFormat(a.format || 'TV'),
      sourceUrl: validPoster(a.sourceUrl || ''),
      synopsis: String(a.synopsis || '').slice(0, 1800),
      hydrated: !!a.hydrated,
      franchiseVersion: String(a.franchiseVersion || '').slice(0, 20),
      tvmazeId: String(a.tvmazeId || '').slice(0, 30),
      tvmazeLoaded: !!a.tvmazeLoaded,
      rewatches: (Array.isArray(a.rewatches) ? a.rewatches : []).slice(-40).map((r) => ({
        id: String(r.id || uuid()).slice(0, 90),
        startedAt: String(r.startedAt || ''),
        completedAt: String(r.completedAt || ''),
        episodes: (Array.isArray(r.episodes) ? r.episodes : [])
          .slice(-10000)
          .filter((e) => e && Number.isInteger(Number(e.number)) && Number(e.number) > 0)
          .map((e) => ({
            eventId: String(e.eventId || '').slice(0, 90),
            seasonId: String(e.seasonId || ''),
            number: Number(e.number),
            date: String(e.date || ''),
            diaryNote: String(e.diaryNote || '').slice(0, 1500),
            diaryRating:
              e.diaryRating == null || e.diaryRating === ''
                ? null
                : Math.max(0.5, Math.min(10, Math.round(Number(e.diaryRating) * 2) / 2)),
          })),
      })),
      activeRewatchId: String(a.activeRewatchId || '').slice(0, 90),
      imdbId: /^tt\d{5,12}$/.test(String(a.imdbId || '')) ? String(a.imdbId) : '',
      imdbRating:
        a.imdbRating == null
          ? null
          : Number.isFinite(Number(a.imdbRating))
            ? Math.max(0, Math.min(10, Number(a.imdbRating)))
            : null,
      imdbVotes: Math.max(0, Number(a.imdbVotes) || 0),
      imdbCheckedAt: String(a.imdbCheckedAt || '').slice(0, 40),
      tmdbId: String(a.tmdbId || '').slice(0, 30),
      runtime: Math.max(0, Math.min(1000, Number(a.runtime) || 0)),
      director: String(a.director || '').slice(0, 220),
      cast: String(a.cast || '').slice(0, 1200),
      backdrop: validPoster(a.backdrop || ''),
      releaseDate: String(a.releaseDate || '').slice(0, 20),
      movieWatchCount: Math.max(0, Math.min(999, Number(a.movieWatchCount) || 0)),
      lastWatchedAt: String(a.lastWatchedAt || '').slice(0, 40),
      collectionId: String(a.collectionId || '').slice(0, 30),
      collectionName: String(a.collectionName || '').slice(0, 220),
      createdAt: String(a.createdAt || now()),
      updatedAt: String(a.updatedAt || now()),
      seasons: Array.isArray(a.seasons) && a.seasons.length ? a.seasons : [seed],
    };
    return syncTotals(o);
  }

  function count(a) {
    return visibleSeasons(a).reduce((sum, s) => sum + s.watched.length, 0);
  }

  function percentage(a) {
    const aired = releasedTotal(a);
    return aired ? Math.min(100, Math.round((count(a) / aired) * 100)) : 0;
  }

  function nextSeasonEp(a) {
    for (const s of visibleSeasons(a)) {
      const seen = new Set(s.watched);
      let n = 1;
      while (seen.has(n)) n++;
      if (n <= releasedCount(s)) return { season: s, n };
    }
    return null;
  }

  function nextEp(a) {
    const next = nextSeasonEp(a);
    return next ? `${next.season.title || 'Pjesa'} · ${next.n}` : null;
  }

  function normalizePreferences(raw) {
    const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const allowed = new Set(['episodes', 'comments', 'friends', 'system']);
    const reminderEntries = Object.entries(
      p.calendarReminders &&
        typeof p.calendarReminders === 'object' &&
        !Array.isArray(p.calendarReminders)
        ? p.calendarReminders
        : {},
    )
      .filter(
        ([key, val]) =>
          typeof key === 'string' && key.length <= 180 && [0, 10, 30, 60, 1440].includes(val),
      )
      .slice(-250);
    const customLists = Array.isArray(p.customLists)
      ? p.customLists
          .filter(
            (row) =>
              row &&
              typeof row === 'object' &&
              typeof row.id === 'string' &&
              /^list-[a-zA-Z0-9_-]{3,85}$/.test(row.id) &&
              typeof row.title === 'string',
          )
          .slice(0, 50)
          .map((row) => ({
            id: row.id,
            title: row.title.replace(/\s+/g, ' ').trim().slice(0, 50),
            animeIds: Array.isArray(row.animeIds)
              ? [
                  ...new Set(
                    row.animeIds.filter((id) => typeof id === 'string' && id.length <= 90),
                  ),
                ].slice(0, 150)
              : [],
            createdAt: typeof row.createdAt === 'string' ? row.createdAt.slice(0, 40) : '',
            updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt.slice(0, 40) : '',
          }))
          .filter((row) => row.title.length >= 2)
      : [];
    return {
      weeklyGoal: Math.max(1, Math.min(200, Number(p.weeklyGoal) || 10)),
      notificationRead: Array.isArray(p.notificationRead)
        ? p.notificationRead.filter((x) => typeof x === 'string' && x.length <= 180).slice(-250)
        : [],
      notificationMuted: Array.isArray(p.notificationMuted)
        ? [...new Set(p.notificationMuted.filter((x) => allowed.has(x)))]
        : [],
      notificationDismissed: Array.isArray(p.notificationDismissed)
        ? p.notificationDismissed
            .filter((x) => typeof x === 'string' && x.length <= 180)
            .slice(-250)
        : [],
      calendarReminders: Object.fromEntries(reminderEntries),
      reminderLead: [0, 10, 30, 60, 1440].includes(Number(p.reminderLead))
        ? Number(p.reminderLead)
        : 30,
      pushEnabled: p.pushEnabled === true,
      homeQueue: Array.isArray(p.homeQueue)
        ? [...new Set(p.homeQueue.filter((x) => typeof x === 'string' && x.length <= 90))].slice(
            0,
            6,
          )
        : [],
      shareFriendActivity: p.shareFriendActivity === true,
      watchRegion: /^[A-Z]{2}$/.test(String(p.watchRegion || '').toUpperCase())
        ? String(p.watchRegion).toUpperCase()
        : 'AL',
      providerAutoSync: p.providerAutoSync === true,
      customLists,
    };
  }

  function normalizeTVShows(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = new Set();
    return raw
      .slice(0, 800)
      .map((show) => {
        if (
          !show ||
          typeof show !== 'object' ||
          !/^tvmaze-[1-9]\d*$/.test(String(show.id || '')) ||
          ids.has(show.id) ||
          typeof show.title !== 'string'
        )
          return null;
        ids.add(show.id);
        const seasons = Array.isArray(show.seasons)
          ? show.seasons.slice(0, 90).map((season) => ({
              number: Math.max(0, Math.min(99, Number(season?.number) || 0)),
              episodes: Array.isArray(season?.episodes)
                ? season.episodes
                    .slice(0, 500)
                    .filter((ep) => Number.isInteger(Number(ep?.id)) && Number(ep.id) > 0)
                    .map((ep) => ({
                      id: Number(ep.id),
                      number: Math.max(1, Math.min(9999, Number(ep.number) || 1)),
                      title: String(ep.title || 'Episodi').slice(0, 180),
                      airdate: /^\d{4}-\d{2}-\d{2}$/.test(String(ep.airdate || ''))
                        ? ep.airdate
                        : '',
                      runtime: Math.max(0, Math.min(600, Number(ep.runtime) || 0)),
                      summary: String(ep.summary || '').slice(0, 900),
                      image: validPoster(ep.image || ''),
                    }))
                : [],
            }))
          : [];
        const validIds = new Set(seasons.flatMap((season) => season.episodes.map((ep) => ep.id)));
        return {
          id: String(show.id),
          source: 'TVmaze',
          sourceId: Number(show.sourceId) || Number(String(show.id).slice(7)),
          title: show.title.trim().slice(0, 180),
          image: validPoster(show.image || ''),
          year: Number(show.year) || null,
          genres: Array.isArray(show.genres)
            ? show.genres
                .filter((g) => typeof g === 'string')
                .slice(0, 8)
                .map((g) => g.slice(0, 60))
            : [],
          summary: String(show.summary || '').slice(0, 1400),
          network: String(show.network || '').slice(0, 120),
          rating: Number(show.rating) || null,
          showStatus: String(show.showStatus || '').slice(0, 50),
          url: /^https:\/\/www\.tvmaze\.com\//.test(String(show.url || '')) ? show.url : '',
          status: STATUS[show.status] ? show.status : 'planning',
          watched: Array.isArray(show.watched)
            ? [...new Set(show.watched.map(Number).filter((id) => validIds.has(id)))]
            : [],
          updatedAt: String(show.updatedAt || '').slice(0, 40),
          seasons,
        };
      })
      .filter(Boolean);
  }

  function isSeriesFormat(format) {
    return ['TV', 'TV_SHORT', 'ONA', 'TV_SERIES'].includes(mediaFormat(format));
  }

  function seasonNumberFor(a, s) {
    if (!a || !s) return 0;
    const parts = visibleSeasons(a),
      idx = parts.indexOf(s);
    if (idx < 0) return 0;
    return parts.slice(0, idx + 1).filter((x) => isSeriesFormat(x.format)).length;
  }

  function formatLabel(format) {
    const f = mediaFormat(format);
    return f === 'MOVIE'
      ? 'FILM'
      : f === 'OVA'
        ? 'OVA'
        : f === 'SPECIAL'
          ? 'SPECIAL'
          : f === 'ONA'
            ? 'ONA'
            : f === 'TV_SHORT'
              ? 'TV SHORT'
              : 'TV';
  }
  return {
    validPoster,
    uuid,
    now,
    genresOf,
    mediaFormat,
    isMovieAnime,
    isLiveMovie,
    mediaKind,
    movieWatched,
    isConfirmedFutureSeason,
    visibleSeasons,
    hiddenSeasons,
    futureSeasonOf,
    tidyNums,
    normSeason,
    mediaStartIso,
    releaseFromMedia,
    releasedCount,
    releasedTotal,
    plannedPending,
    pendingReleaseText,
    releasedStatusAfterWatch,
    syncTotals,
    normalized,
    count,
    percentage,
    nextSeasonEp,
    nextEp,
    normalizePreferences,
    normalizeTVShows,
    isSeriesFormat,
    seasonNumberFor,
    formatLabel,
  };
}
