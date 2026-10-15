import { TERMINAL_STATUSES, type GeoPoint, type Report } from '../../types/domain';

export const isOpen = (r: Pick<Report, 'status'>): boolean => !TERMINAL_STATUSES.includes(r.status);

export function formatTime(d: unknown): string {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleString() : 'Unknown time';
}

export function distanceMeters(a: GeoPoint | null | undefined, b: GeoPoint | null | undefined): number | null {
  const ok = (l: GeoPoint | null | undefined): l is GeoPoint => !!l && Number.isFinite(l.lat) && Number.isFinite(l.lng);
  if (!ok(a) || !ok(b)) return null;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}
