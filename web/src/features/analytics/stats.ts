import { api } from '../../api/client';

export interface DayCount {
  date: string;
  count: number;
}

export interface Stats {
  total: number;
  open: number;
  resolved: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  perDay: DayCount[];
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
  return {
    total: num(r.total),
    open: num(r.open),
    resolved: num(r.resolved),
    byType: counts(r.byType),
    byStatus: counts(r.byStatus),
    perDay,
  };
}

export async function fetchStats(query = ''): Promise<Stats> {
  return toStats(await api(`/stats${query ? `?${query}` : ''}`));
}
