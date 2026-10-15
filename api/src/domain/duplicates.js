import { isOpen } from './workflow.js';

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const ms = (t) => (t instanceof Date ? t.getTime() : new Date(t).getTime());

export function haversineMeters(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function findPossibleDuplicates(report, openReports, { radiusM = 200, windowHours = 6 } = {}) {
  const t0 = ms(report.createdAt);
  const windowMs = windowHours * 3600 * 1000;
  return openReports
    .filter((o) => o.id !== report.id && o.type === report.type && isOpen(o.status))
    .filter((o) => Math.abs(t0 - ms(o.createdAt)) <= windowMs)
    .filter((o) => haversineMeters(report.location, o.location) <= radiusM)
    .map((o) => o.id);
}
