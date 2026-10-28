import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REPORT_TYPES, REPORT_STATUSES } from '../../types/domain';
import ChartCard, { type ChartDatum } from './ChartCard';
import ExportButtons, { buildExportQuery, type ExportFilters } from './ExportButtons';
import { fetchStats, type Stats } from './stats';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { typeLabel } from '../../lib/reportTypes';

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
  // Types with no reports are left out. The bar colour follows the type key; the name shown is its label.
  const byType = Object.entries(stats?.byType ?? {}).filter(([, count]) => count > 0).map(([key, value]): ChartDatum => ({ label: typeLabel(key), colorKey: key, value }));
  const byStatus = Object.entries(stats?.byStatus ?? {}).map(toDatum);
  const perDay = (stats?.perDay ?? []).map((d) => ({ label: d.date, value: d.count }));
  const perMonth = (stats?.perMonth ?? []).map((m) => ({ label: m.month, value: m.count }));
  // Priorities run from most urgent to least, not by count.
  const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
  const byPriority = Object.entries(stats?.byPriority ?? {}).map(toDatum)
    .sort((a, b) => (PRIORITY_ORDER.indexOf(a.label) + 1 || 99) - (PRIORITY_ORDER.indexOf(b.label) + 1 || 99));
  const byLocation = Object.entries(stats?.byLocation ?? {}).map(toDatum);

  return (
    <div>
      {!invalidRange && stats && <dl className="analytics-summary"><div><dt>Reports in this period</dt><dd>{stats.total}</dd></div><div><dt>Open incidents</dt><dd>{stats.open}</dd></div><div><dt>Resolved</dt><dd>{stats.resolved}</dd></div></dl>}
      <MotionForm className="filters card" aria-label="Analytics filters" onSubmit={(e) => e.preventDefault()}>
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
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
        </div>
        <div className="filter">
          <label htmlFor="an-status">Status</label>
          <select id="an-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </MotionForm>

      {invalidRange && <FieldError className="range-error" role="alert" id="range-error">The end date must be on or after the start date.</FieldError>}
      {!invalidRange && <ExportButtons filters={filters} />}

      {!invalidRange && loading && <Skeleton label="Loading analytics"><SkeletonRows rows={3} height={180} /></Skeleton>}
      {!invalidRange && !loading && result?.error && (
        <Banner tone="error" role="alert">
          Could not load analytics. Check your connection and try again.{' '}
          <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
        </Banner>
      )}

      {!invalidRange && !loading && !result?.error && (
        <div className="analytics-grid">
          <ChartCard title="Incidents by type" labelHeader="Type" data={byType} palette="type" />
          <ChartCard title="Incidents by status" labelHeader="Status" data={byStatus} palette="status" />
          <ChartCard title="Incidents by priority" labelHeader="Priority" data={byPriority} palette="priority" />
          <ChartCard title="Incidents per month" labelHeader="Month" data={perMonth} chronological formatLabel={(m) => m} />
          <ChartCard title="Incidents per day" labelHeader="Day" data={perDay} chronological />
          <ChartCard title="Reports by location" labelHeader="Location" data={byLocation} />
        </div>
      )}
    </div>
  );
}
