import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REPORT_TYPES, REPORT_STATUSES } from '../../types/domain';
import ChartCard, { type ChartDatum } from './ChartCard';
import ExportButtons, { buildExportQuery, type ExportFilters } from './ExportButtons';
import { fetchStats, type Stats } from './stats';
import Banner from '../../components/calm/Banner';

const FILTER_KEYS = ['from', 'to', 'type', 'status'] as const;

interface Result {
  key: string;
  stats?: Stats;
  error?: boolean;
}

const toDatum = ([label, value]: [string, number]): ChartDatum => ({ label, value });

export default function AnalyticsPage() {
  // Filters live in the URL so a filtered view can be bookmarked and shared.
  const [params, setParams] = useSearchParams();
  const filters: ExportFilters = {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    type: params.get('type') ?? '',
    status: params.get('status') ?? '',
  };
  // Every filter goes to the server, so totals, by-type, by-status, and per-day all agree.
  const dateKey = buildExportQuery(filters);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (invalidRange) return;
    let cancelled = false;
    fetchStats(dateKey)
      .then((stats) => { if (!cancelled) setResult({ key: dateKey, stats }); })
      .catch(() => { if (!cancelled) setResult({ key: dateKey, error: true }); });
    return () => { cancelled = true; };
  }, [dateKey, invalidRange, attempt]);
  const retry = () => { setResult(null); setAttempt((n) => n + 1); };

  function setFilter(key: (typeof FILTER_KEYS)[number], value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  const loading = result?.key !== dateKey;
  const stats = result?.key === dateKey ? result.stats : undefined;
  const byType = Object.entries(stats?.byType ?? {}).map(toDatum);
  const byStatus = Object.entries(stats?.byStatus ?? {}).map(toDatum);
  const perDay = (stats?.perDay ?? []).map((d) => ({ label: d.date, value: d.count }));

  return (
    <div>
      <form className="filters card" role="group" aria-label="Analytics filters" onSubmit={(e) => e.preventDefault()}>
        <div className="filter">
          <label htmlFor="an-from">From</label>
          <input id="an-from" type="date" value={filters.from} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'range-error' : undefined} onChange={(e) => setFilter('from', e.target.value)} />
        </div>
        <div className="filter">
          <label htmlFor="an-to">To</label>
          <input id="an-to" type="date" value={filters.to} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'range-error' : undefined} onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        <div className="filter">
          <label htmlFor="an-type">Type</label>
          <select id="an-type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">All</option>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter">
          <label htmlFor="an-status">Status</label>
          <select id="an-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </form>

      {invalidRange && <p className="range-error" role="alert" id="range-error">The end date must be on or after the start date.</p>}
      {!invalidRange && <ExportButtons filters={filters} />}

      {!invalidRange && loading && <p role="status" className="loading">Loading...</p>}
      {!invalidRange && !loading && result?.error && (
        <Banner tone="error" role="alert">
          Could not load analytics. Check your connection and try again.{' '}
          <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
        </Banner>
      )}

      {!invalidRange && !loading && !result?.error && (
        <div className="analytics-grid">
          <ChartCard title="Incidents by type" labelHeader="Type" data={byType} />
          <ChartCard title="Incidents by status" labelHeader="Status" data={byStatus} />
          <ChartCard title="Incidents per day" labelHeader="Day" data={perDay} />
        </div>
      )}
    </div>
  );
}
