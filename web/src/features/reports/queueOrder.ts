// Statuses that still need someone to act. The API list (api/src/domain/queueOrder.js) also holds Resolved for the close step.
// Resolved stays in the inbox: the administrator closes it to free the team (api/src/domain/workflow.js).
export const AWAITING_STATUSES = ['Submitted', 'Under Verification', 'Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved'] as const;

// Oldest submission first, for reports waiting on action. Same rule as the API queue: equal times fall back to id,
// and a report with no usable time goes last.
const timeOf = (v: unknown): number => {
  const ms = v instanceof Date ? v.getTime() : Number.NaN;
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

export interface Queued {
  id: string;
  createdAt?: unknown;
  priority?: string;
}

export function compareOldestFirst(a: Queued, b: Queued): number {
  const ta = timeOf(a.createdAt);
  const tb = timeOf(b.createdAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// Critical first, then high, medium and low. A report with no known priority counts as medium.
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const priorityRank = (p: string | undefined): number =>
  p !== undefined && Object.hasOwn(PRIORITY_RANK, p) ? PRIORITY_RANK[p] : PRIORITY_RANK.medium;

// Priority first; inside one priority level, oldest first. Same rule as the API queue.
export function compareQueue(a: Queued, b: Queued): number {
  const d = priorityRank(a.priority) - priorityRank(b.priority);
  return d !== 0 ? d : compareOldestFirst(a, b);
}

export function sortQueue<T extends Queued>(rows: readonly T[]): T[] {
  return [...rows].sort(compareQueue);
}

// Open reports first (by priority, oldest first within each); everything else after them, newest first, with unreadable times last.
export function orderQueue<T extends Queued>(rows: readonly T[], isOpenRow: (row: T) => boolean): T[] {
  const open = sortQueue(rows.filter(isOpenRow));
  const rest = rows.filter((r) => !isOpenRow(r)).sort((a, b) => {
    const ta = timeOf(a.createdAt);
    const tb = timeOf(b.createdAt);
    if (ta === tb) return compareOldestFirst(a, b);
    if (ta === Number.POSITIVE_INFINITY) return 1;
    if (tb === Number.POSITIVE_INFINITY) return -1;
    return ta > tb ? -1 : 1;
  });
  return [...open, ...rest];
}

// The sort the person picks above the list. The default keeps open reports first, by priority, then oldest.
export const SORT_OPTIONS = [
  ['', 'Priority first, then oldest'],
  ['newest', 'Newest to oldest'],
  ['oldest', 'Oldest to newest'],
  ['priority-high', 'Priority: highest first'],
  ['priority-low', 'Priority: lowest first'],
] as const;
export type SortMode = (typeof SORT_OPTIONS)[number][0];
export const isSortMode = (v: string | null): v is Exclude<SortMode, ''> => SORT_OPTIONS.some(([key]) => key !== '' && key === v);

// A report with no usable time goes last in either direction. Equal times fall back to the id so the order never flickers.
const byTime = (direction: 1 | -1) => (a: Queued, b: Queued): number => {
  const ta = timeOf(a.createdAt);
  const tb = timeOf(b.createdAt);
  if (ta === tb) return compareOldestFirst(a, b);
  if (ta === Number.POSITIVE_INFINITY) return 1;
  if (tb === Number.POSITIVE_INFINITY) return -1;
  return ta < tb ? direction : -direction;
};

export function sortRows<T extends Queued>(rows: readonly T[], mode: Exclude<SortMode, ''>): T[] {
  const copy = [...rows];
  if (mode === 'newest') return copy.sort(byTime(1));
  if (mode === 'oldest') return copy.sort(byTime(-1));
  const sign = mode === 'priority-high' ? 1 : -1;
  return copy.sort((a, b) => {
    const d = priorityRank(a.priority) - priorityRank(b.priority);
    return d !== 0 ? sign * d : byTime(-1)(a, b);
  });
}
