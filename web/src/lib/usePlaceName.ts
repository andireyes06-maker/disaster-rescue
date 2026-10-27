import { useEffect, useState } from 'react';
import { approximatePlaceName } from './placeName';
import type { GeoPoint } from '../types/domain';
const recent = new Map<string, Promise<string | null>>();
export function usePlaceName(point?: GeoPoint | null, saved?: string | null) {
  const valid = point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
  const key = valid ? `${point.lat.toFixed(3)},${point.lng.toFixed(3)}` : '';
  const [result, setResult] = useState<{ key: string; name: string | null } | null>(null);
  useEffect(() => {
    if (!key || saved?.trim()) return;
    let alive = true;
    let request = recent.get(key);
    if (!request) {
      const [lat, lng] = key.split(',').map(Number);
      request = approximatePlaceName(lat, lng); recent.set(key, request);
      while (recent.size > 128) recent.delete(recent.keys().next().value!);
    }
    request.then(name => { if (alive) setResult({ key, name }); if (!name && recent.get(key) === request) recent.delete(key); });
    return () => { alive = false; };
  }, [key, saved]);
  const name = saved?.trim() || (result?.key === key ? result.name : null);
  return { name, loading: Boolean(key && !saved?.trim() && result?.key !== key), coordinates: valid ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : null };
}
