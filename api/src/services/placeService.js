// One shared queue per API process. Current deployment runs one API instance.
// A selected point is rounded to ~110 m before it leaves the API; no contact data is sent.
export function createPlaceLookup({ fetcher = fetch, endpoint = process.env.GEOCODER_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse', now = Date.now, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const cache = new Map();
  const pending = new Map();
  let tail = Promise.resolve();
  let nextAt = 0;
  return function lookup(lat, lng) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const hit = cache.get(key);
    if (hit && hit.until > now()) return Promise.resolve(hit.name);
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 8) return Promise.resolve(null);
    const work = tail.then(async () => {
      await wait(Math.max(0, nextAt - now()));
      nextAt = now() + 1100;
      let name = null;
      try {
        const url = new URL(endpoint);
        for (const [k, v] of Object.entries({ format: 'jsonv2', lat: lat.toFixed(3), lon: lng.toFixed(3), zoom: '17', addressdetails: '1', 'accept-language': 'en' })) url.searchParams.set(k, v);
        const response = await fetcher(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json', 'User-Agent': 'I-Report/1.0 (https://disaster-rescue-web.vercel.app)' } });
        if (response.ok) {
          const reply = await response.json();
          const address = reply?.address;
          if (address && typeof address === 'object') {
            const pick = keys => keys.map(k => address[k]).find(v => typeof v === 'string' && v.trim())?.trim();
            const road = pick(['road', 'pedestrian', 'footway']);
            const district = pick(['neighbourhood', 'suburb', 'village', 'hamlet']);
            const city = pick(['city', 'town', 'municipality', 'county', 'state']);
            name = [...new Set([road, district, city].filter(Boolean))].join(', ').slice(0, 200) || null;
          }
        }
      } catch { /* A place label is optional; the selected coordinates remain usable. */ }
      cache.delete(key);
      cache.set(key, { name, until: now() + (name ? 86400000 : 60000) });
      while (cache.size > 512) cache.delete(cache.keys().next().value);
      return name;
    });
    tail = work.catch(() => null);
    const result = work.finally(() => pending.delete(key));
    pending.set(key, result);
    return result;
  };
}
