import { api } from '../../api/client';

export interface DayCount {
  date: string;
  count: number;
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface Stats {
  total: number;
  open: number;
  resolved: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byPlace: Record<string, number>;
  byArea: Record<string, number>;
  perDay: DayCount[];
  perMonth: MonthCount[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function counts(v: unknown): Record<string, number> {
  if (!isRecord(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number')) as Record<string, number>;
}

// Boundary: the API response is untyped JSON. Missing or malformed fields fall back to empty values.
export function toStats(data: unknown): Stats {
  const r = isRecord(data) ? data : {};
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  const perDay = Array.isArray(r.perDay)
    ? r.perDay.filter(isRecord).map((d) => ({ date: String(d.date ?? ''), count: num(d.count) }))
    : [];
  const perMonth = Array.isArray(r.perMonth)
    ? r.perMonth.filter(isRecord).map((m) => ({ month: String(m.month ?? ''), count: num(m.count) }))
    : [];
  return {
    total: num(r.total),
    open: num(r.open),
    resolved: num(r.resolved),
    byType: counts(r.byType),
    byStatus: counts(r.byStatus),
    byPriority: counts(r.byPriority),
    byPlace: counts(r.byPlace),
    byArea: counts(r.byArea),
    perDay,
    perMonth,
  };
}

export async function fetchStats(query = ''): Promise<Stats> {
  const data = await api(`/stats${query ? `?${query}` : ''}`);
  if (!isRecord(data) || !['total', 'open', 'resolved'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0) || !isRecord(data.byType) || !isRecord(data.byStatus) || !Array.isArray(data.perDay)) throw new Error('Invalid analytics response');
  return toStats(data);
}
