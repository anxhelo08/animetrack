export function syncPresentation(info = {}, online = true) {
  if (info.mode !== 'cloud')
    return {
      kind: 'local',
      label: 'Vetëm në këtë pajisje',
      text: 'Hyr në llogari për ta përdorur bibliotekën në pajisje të tjera.',
    };
  if (info.conflict)
    return {
      kind: 'conflict',
      label: 'Duhet kontrolluar',
      text: 'Ka ndryshime në pajisje dhe në llogari. Hape llogarinë për t’i shqyrtuar.',
    };
  if (info.mirrorUnavailable)
    return {
      kind: 'warning',
      label: 'Kopja lokale nuk u ruajt',
      text: 'Eksporto një kopje ose liro hapësirë në pajisje.',
    };
  if (!online)
    return {
      kind: 'offline',
      label: 'Pa internet',
      text: info.dirty
        ? 'Ndryshimet në pajisje presin lidhjen për t’u sinkronizuar.'
        : 'Biblioteka e ruajtur në pajisje është e disponueshme.',
    };
  if (info.saving)
    return {
      kind: 'saving',
      label: 'Po sinkronizohet…',
      text: 'Progresi yt po dërgohet në llogari.',
    };
  if (info.connected === false)
    return {
      kind: 'error',
      label: 'Lidhja nuk u krye',
      text: info.dirty
        ? 'Ndryshimet janë ruajtur në pajisje. Lidhja me llogarinë dështoi; provo përsëri për t’i sinkronizuar.'
        : 'Kopja në pajisje mbetet e disponueshme. Provo përsëri.',
    };
  if (info.dirty)
    return {
      kind: 'pending',
      label: 'Ndryshime në pritje',
      text: 'Progresi është në pajisje dhe pret sinkronizimin.',
    };
  if (info.connected)
    return { kind: 'synced', label: 'E sinkronizuar', text: 'Progresi është ruajtur në llogari.' };
  return {
    kind: 'error',
    label: 'Lidhja nuk u krye',
    text: 'Kopja në pajisje mbetet e disponueshme. Provo përsëri.',
  };
}
