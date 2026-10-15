export const TYPES = ['flood', 'fire', 'earthquake', 'landslide', 'other'];
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['Submitted', 'Under Verification', 'Verified', 'Awaiting Assignment', 'Team Assigned',
  'Rescue in Progress', 'Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'];
export const TERMINAL = ['Closed', 'Rejected', 'Duplicate', 'Cancelled'];

export const isOpen = (r) => !TERMINAL.includes(r.status);

export function formatTime(d) {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleString() : 'Unknown time';
}

export function distanceMeters(a, b) {
  const ok = (l) => l && Number.isFinite(l.lat) && Number.isFinite(l.lng);
  if (!ok(a) || !ok(b)) return null;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}
