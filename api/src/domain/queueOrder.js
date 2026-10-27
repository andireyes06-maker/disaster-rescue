// Statuses that still need someone to act. Closed, rejected, duplicate and cancelled reports are not queued.
export const AWAITING_ACTION = new Set([
  'Submitted', 'Under Verification', 'Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved',
]);

// Reads a Date, epoch milliseconds, an ISO string, or a Firestore Timestamp. Anything else sorts last.
export function toMillis(value) {
  let ms = Number.NaN;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === 'number') ms = value;
  else if (typeof value === 'string') ms = Date.parse(value);
  else if (value && typeof value.toMillis === 'function') ms = value.toMillis();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

// Critical first, then high, medium and low. A report with no known priority counts as medium.
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
export const priorityRank = (p) => (Object.hasOwn(PRIORITY_RANK, p) ? PRIORITY_RANK[p] : PRIORITY_RANK.medium);

// Priority first; inside one priority level, oldest first.
export function compareQueue(a, b) {
  const d = priorityRank(a.priority) - priorityRank(b.priority);
  return d !== 0 ? d : compareOldestFirst(a, b);
}

// Oldest submission first. Equal times fall back to id so the order is the same on every load.
export function compareOldestFirst(a, b) {
  const ta = toMillis(a.createdAt);
  const tb = toMillis(b.createdAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  const ia = String(a.id ?? '');
  const ib = String(b.id ?? '');
  if (ia === ib) return 0;
  return ia < ib ? -1 : 1;
}
