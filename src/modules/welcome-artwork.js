/** Fetch original, large cover artwork without blocking signup or authentication. */
export function mountWelcomeArtwork(root) {
  if (!root) return;
  let started = false;
  for (const img of root.querySelectorAll('[data-welcome-anime]')) {
    img.addEventListener('error', () => img.classList.add('welcome-artwork-unavailable'));
    img.addEventListener('load', () => img.classList.remove('welcome-artwork-unavailable'));
  }
  async function load() {
    if (started || root.hidden) return;
    started = true;
    const images = [...root.querySelectorAll('[data-welcome-anime]')].filter(
      (img) => ![101922, 16498, 21].includes(Number(img.dataset.welcomeAnime)),
    );
    const ids = [...new Set(images.map((img) => Number(img.dataset.welcomeAnime)))];
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            'query($ids:[Int]){Page(perPage:20){media(id_in:$ids,type:ANIME,isAdult:false){id coverImage{extraLarge large}}}}',
          variables: { ids },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const result = await response.json();
      for (const media of result.data?.Page?.media || []) {
        const url = media.coverImage?.extraLarge || media.coverImage?.large;
        if (
          !url ||
          !/^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\//.test(url)
        )
          continue;
        for (const img of images.filter((img) => Number(img.dataset.welcomeAnime) === media.id)) {
          img.removeAttribute('srcset');
          img.src = url;
        }
      }
    } catch {
      // Static poster sources remain usable when the public catalog is unavailable.
    }
  }
  const observer = new MutationObserver(load);
  observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });
  void load();
}
