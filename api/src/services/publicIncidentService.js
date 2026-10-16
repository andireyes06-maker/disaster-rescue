import { coarsen } from '../domain/privacy.js';

// Public view of incidents: only these five statuses, mapped to a coarse category.
const CATEGORY = {
  Verified: 'open',
  'Awaiting Assignment': 'open',
  'Team Assigned': 'responding',
  'Rescue in Progress': 'responding',
  Resolved: 'resolved',
};

export const PUBLIC_RADIUS_METERS = 500;

// Returns only type, coarse category, rounded centre, and radius. Never an id, reporter, contact, photo, or address.
export async function listPublicIncidents({ repo }) {
  const rows = await repo.listReports({});
  return rows
    .filter((r) => CATEGORY[r.status] && Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .map((r) => ({
      type: r.type,
      statusCategory: CATEGORY[r.status],
      center: coarsen(r.lat, r.lng),
      radiusMeters: PUBLIC_RADIUS_METERS,
    }));
}
