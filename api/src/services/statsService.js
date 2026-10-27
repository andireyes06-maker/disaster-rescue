import { STATUS } from '../domain/workflow.js';
import { HttpError } from '../errors.js';

const NOT_OPEN = new Set([STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELLED, STATUS.REJECTED, STATUS.DUPLICATE]);
const RESOLVED = new Set([STATUS.RESOLVED, STATUS.CLOSED]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ISO date (YYYY-MM-DD) to a Date. `to` is inclusive of its whole UTC day.
export function parseRange(query = {}) {
  const parse = (v, endOfDay) => {
    if (v === undefined || v === '') return undefined;
    const bad = () => new HttpError(400, 'invalid_date', 'Dates must be YYYY-MM-DD');
    if (typeof v !== 'string' || !DATE_RE.test(v)) throw bad();
    const d = new Date(`${v}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw bad();
    return d;
  };
  return { from: parse(query.from, false), to: parse(query.to, true) };
}

// Optional type and status filters. Short plain strings only; anything else is ignored.
const FILTER_RE = /^[A-Za-z ]{1,40}$/;
export function parseFilters(query = {}) {
  const pick = (v) => (typeof v === 'string' && FILTER_RE.test(v) ? v : undefined);
  return { ...parseRange(query), type: pick(query.type), status: pick(query.status) };
}

// Reports in range, each with its updates attached (needed for peopleRescued).
export async function loadReports(repo, { from, to, type, status } = {}) {
  const reports = await repo.listReports({ from, to, type, status });
  // Four concurrent aggregates at most. Existing histories are summed directly,
  // so no backfill or guessed zero can undercount older rescues.
  const rows = new Array(reports.length); let next = 0;
  await Promise.all(Array.from({length: Math.min(4, reports.length)}, async () => {
    while (next < reports.length) {
      const index = next++; const report = reports[index];
      const updates = repo.sumPeopleRescued
        ? [{peopleRescued: await repo.sumPeopleRescued(report.id)}]
        : await repo.listUpdates(report.id);
      rows[index] = {...report, updates};
    }
  }));
  return rows;
}

const countBy = (rows, key) => rows.reduce((acc, r) => {
  if (r[key] !== undefined && r[key] !== null) acc[r[key]] = (acc[r[key]] ?? 0) + 1;
  return acc;
}, {});

export function buildStats(reports, { from, to } = {}) {
  const rows = reports.filter((r) => (!from || r.createdAt >= from) && (!to || r.createdAt <= to));

  const days = new Map();
  for (const r of rows) {
    const date = r.createdAt.toISOString().slice(0, 10);
    days.set(date, (days.get(date) ?? 0) + 1);
  }
  const perDay = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

  const months = new Map();
  for (const r of rows) {
    const month = r.createdAt.toISOString().slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const perMonth = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));

  // Reports have free-text addresses, not a region field. Group by the address text, ignoring case and extra spaces.
  const places = new Map();
  for (const r of rows) {
    const text = typeof r.addressText === 'string' ? r.addressText.trim().replace(/\s+/g, ' ') : '';
    if (!text) continue;
    const key = text.toLowerCase();
    const entry = places.get(key) ?? { label: text, count: 0 };
    entry.count += 1;
    places.set(key, entry);
  }
  const byPlace = Object.fromEntries(
    [...places.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 10).map((p) => [p.label, p.count]),
  );

  const minutes = rows.filter((r) => r.assignedAt).map((r) => (r.assignedAt - r.createdAt) / 60000);
  const avgResponseMinutes = minutes.length
    ? Math.round((minutes.reduce((a, b) => a + b, 0) / minutes.length) * 10) / 10
    : null;

  const peopleRescued = rows.reduce((sum, r) => sum + (r.updates ?? []).reduce(
    (s, u) => s + (Number.isFinite(u.peopleRescued) ? u.peopleRescued : 0), 0), 0);

  return {
    total: rows.length,
    open: rows.filter((r) => !NOT_OPEN.has(r.status)).length,
    resolved: rows.filter((r) => RESOLVED.has(r.status)).length,
    byType: countBy(rows, 'type'),
    byStatus: countBy(rows, 'status'),
    byPriority: countBy(rows, 'priority'),
    // Reports filed before areas existed have none; they are counted together as "Not recorded".
    byArea: countBy(rows.map((r) => ({ ...r, area: r.area || 'Not recorded' })), 'area'),
    perDay,
    perMonth,
    byPlace,
    avgResponseMinutes,
    peopleRescued,
  };
}

// Counts for one responder team only. Aggregates; no names, contacts, photos or locations.
export function teamSummary(reports, teamId) {
  const mine = reports.filter((r) => r.assignedTeamId === teamId);
  const s = buildStats(mine, {});
  return { total: s.total, open: s.open, resolved: s.resolved, byStatus: s.byStatus, peopleRescued: s.peopleRescued };
}
