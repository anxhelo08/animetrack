const relations = new Set([
  'PREQUEL',
  'SEQUEL',
  'ALTERNATIVE',
  'SUMMARY',
  'COMPILATION',
  'CONTAINS',
  'PARENT',
]);
const formats = new Set(['TV', 'TV_SHORT', 'ONA', 'OVA', 'MOVIE', 'SPECIAL']);
const anime = (item) =>
  !item.kind && ['AniList', 'MyAnimeList'].includes(item.source) && formats.has(item.format);
const identity = (item) =>
  item.source === 'AniList' ? 'al:' + item.sourceId : 'mal:' + (item.malId || item.sourceId);

/** Only publisher relation IDs join a family; similar names never imply shared seasons. */
export function groupCatalogResults(items = []) {
  const parents = new Map();
  const find = (id) => {
    if (!parents.has(id)) parents.set(id, id);
    let root = id;
    while (parents.get(root) !== root) root = parents.get(root);
    while (parents.get(id) !== id) {
      const next = parents.get(id);
      parents.set(id, root);
      id = next;
    }
    return root;
  };
  const join = (a, b) => parents.set(find(b), find(a));
  for (const item of items) {
    if (!anime(item)) continue;
    const id = identity(item);
    find(id);
    if (item.malId) join(id, 'mal:' + item.malId);
    for (const link of item.catalogRelations || []) {
      if (!relations.has(link.relationType) || link.type !== 'ANIME' || !formats.has(link.format))
        continue;
      if (link.id) join(id, 'al:' + link.id);
      if (link.idMal) join(id, 'mal:' + link.idMal);
    }
  }
  const groups = new Map();
  for (const item of items) {
    const key = anime(item) ? find(identity(item)) : item.key;
    if (!groups.has(key)) groups.set(key, []);
    if (!groups.get(key).some((part) => part.key === item.key)) groups.get(key).push(item);
  }
  return [...groups.values()].map((parts) => {
    if (!anime(parts[0])) return parts[0];
    const sorted = parts
      .slice()
      .sort(
        (a, b) =>
          String(a.releaseStart || (a.year || 9999) + '-12-31').localeCompare(
            String(b.releaseStart || (b.year || 9999) + '-12-31'),
          ) || Number(a.sourceId) - Number(b.sourceId),
      );
    const representative =
      sorted.find((part) => ['TV', 'TV_SHORT', 'ONA'].includes(part.format)) || sorted[0];
    return { ...representative, catalogParts: sorted };
  });
}

export function linkedAnimeMedia(media) {
  const found = new Map();
  for (const item of media || []) {
    found.set(item.id, { ...found.get(item.id), ...item });
    for (const edge of item.relations?.edges || []) {
      const node = edge.node;
      if (
        relations.has(edge.relationType) &&
        node?.type === 'ANIME' &&
        formats.has(node.format) &&
        !node.isAdult &&
        !found.has(node.id)
      )
        found.set(node.id, node);
    }
  }
  return [...found.values()];
}
