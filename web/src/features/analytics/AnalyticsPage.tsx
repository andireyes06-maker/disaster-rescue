import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REPORT_TYPES, REPORT_STATUSES } from '../../types/domain';
import ChartCard, { type ChartDatum } from './ChartCard';
import ExportButtons, { buildExportQuery, type ExportFilters } from './ExportButtons';
import { fetchStats, type Stats } from './stats';

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

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchStats(dateKey)
      .then((stats) => { if (!cancelled) setResult({ key: dateKey, stats }); })
      .catch(() => { if (!cancelled) setResult({ key: dateKey, error: true }); });
    return () => { cancelled = true; };
  }, [dateKey]);

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
          <input id="an-from" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        </div>
        <div className="filter">
          <label htmlFor="an-to">To</label>
          <input id="an-to" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
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

      <ExportButtons filters={filters} />

      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && result?.error && <p role="alert" className="error">Could not load analytics. Check your connection and try again.</p>}

      {!loading && !result?.error && (
        <div className="analytics-grid">
          <ChartCard title="Incidents by type" labelHeader="Type" data={byType} />
          <ChartCard title="Incidents by status" labelHeader="Status" data={byStatus} />
          <ChartCard title="Incidents per day" labelHeader="Day" data={perDay} />
        </div>
      )}
    </div>
  );
}
