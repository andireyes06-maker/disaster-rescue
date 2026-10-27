// An approximate place name for a point, the way map apps show one ("Near Commonwealth, Quezon City").
// Uses OpenStreetMap's reverse lookup on a point rounded to about 110 m. Returns null when no name is found.

function pick(address: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

// Builds "Near local, city" from a reverse-lookup reply.
export function placeNameFrom(reply: unknown): string | null {
  if (!reply || typeof reply !== 'object') return null;
  const address = (reply as { address?: unknown }).address;
  if (!address || typeof address !== 'object') return null;
  const fields = address as Record<string, unknown>;
  const local = pick(fields, ['neighbourhood', 'suburb', 'village', 'hamlet', 'road']);
  const city = pick(fields, ['city', 'town', 'municipality', 'county', 'state']);
  if (!local) return city;
  if (!city || city === local) return `Near ${local}`;
  return `Near ${local}, ${city}`;
}

export async function approximatePlaceName(lat: number, lng: number): Promise<string | null> {
  try {
    const query = new URLSearchParams({
      format: 'jsonv2',
      lat: lat.toFixed(3),
      lon: lng.toFixed(3),
      zoom: '17',
      addressdetails: '1',
      'accept-language': 'en',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return placeNameFrom(await res.json());
  } catch {
    return null;
  }
}
