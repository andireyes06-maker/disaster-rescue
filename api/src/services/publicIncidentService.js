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

// The public map may lag a new report by up to this long. Keeps a scan of every report off the request path.
export const PUBLIC_CACHE_MS = 30 * 1000;
// Cached per repo, so each app instance (and each test) has its own copy.
const cache = new WeakMap();

// Returns only type, coarse category, rounded centre, and radius. Never an id, reporter, contact, photo, or address.
export async function listPublicIncidents({ repo }) {
  const hit = cache.get(repo);
  if (hit && Date.now() - hit.at < PUBLIC_CACHE_MS) return hit.value;
  const rows = await repo.listReports({});
  const value = rows
    // Coordinates live in the canonical nested location written at creation (see reportService.create).
    .filter((r) => CATEGORY[r.status] && Number.isFinite(r.location?.lat) && Number.isFinite(r.location?.lng))
    .map((r) => ({
      type: r.type,
      statusCategory: CATEGORY[r.status],
      center: coarsen(r.location.lat, r.location.lng),
      radiusMeters: PUBLIC_RADIUS_METERS,
    }));
  cache.set(repo, { at: Date.now(), value });
  return value;
}
