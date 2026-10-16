import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from './useReports';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import { isOpen, formatTime } from './format';
import { REPORT_TYPES, PRIORITIES, REPORT_STATUSES } from '../../types/domain';
import DataTable, { type Column } from '../../components/calm/DataTable';
import EmptyState from '../../components/calm/EmptyState';
import Card from '../../components/calm/Card';

type Report = ReturnType<typeof useReports>['reports'][number];

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <div className="filter">
      <label htmlFor={`f-${label}`}>{label}</label>
      <select id={`f-${label}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}

interface Filters {
  status: string;
  type: string;
  priority: string;
  verified: string;
}

const queueColumns: Column<Report>[] = [
  {
    key: 'report',
    header: 'Report',
    render: (r) => (
      <Link to={`/incidents/${r.id}`} className="queue__link" title={r.description}>
        <span className="queue__type">{r.type}</span>
        <span className="queue__desc">{r.description}</span>
        <span className="queue__location">{r.addressText || 'No address given'}</span>
      </Link>
    ),
  },
  { key: 'priority', header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'verified', header: 'Verification', render: (r) => <VerifiedBadge verified={r.verified} /> },
  { key: 'reported', header: 'Reported', render: (r) => <time>{formatTime(r.createdAt)}</time> },
];

export default function ReportQueue() {
  const { reports, loading, error, retry } = useReports();
  const [f, setF] = useState<Filters>({ status: '', type: '', priority: '', verified: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.values(f).filter(Boolean).length;
  const set = (k: keyof Filters) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const active = reports.filter((r) => isOpen(r) && r.status !== 'Resolved');

  const rows = reports.filter((r) =>
    (!f.status || r.status === f.status)
    && (!f.type || r.type === f.type)
    && (!f.priority || r.priority === f.priority)
    && (!f.verified || (f.verified === 'verified') === Boolean(r.verified)));

  const cards: [string, number][] = [
    ['All reports', reports.length],
    ['Active reports', active.length],
    ['Critical', active.filter((r) => r.priority === 'critical').length],
    ['Verified', reports.filter((r) => r.verified).length],
  ];

  return (
    <div>
      <div className="summary">
        {cards.map(([label, n]) => (
          <Card key={label} className="summary__card">
            <span className="summary__label">{label}</span>
            <strong className="summary__value">{loading || error ? '—' : n}</strong>
          </Card>
        ))}
      </div>

      <section className="queue-panel" aria-labelledby="queue-heading">
      <div className="queue-toolbar">
        <div><h2 id="queue-heading">Incident queue</h2><p>{loading ? 'Loading reports…' : error ? 'Reports unavailable' : `${rows.length} reports · newest first`}</p></div>
        <div className="queue-toolbar__actions">
        {activeFilters > 0 && <button type="button" className="btn btn--ghost" onClick={() => setF({ status: '', type: '', priority: '', verified: '' })}>Clear filters</button>}
      <button type="button" className="btn btn--ghost filters__toggle" aria-expanded={filtersOpen} aria-controls="report-filters"
        onClick={() => setFiltersOpen((v) => !v)}>
        {filtersOpen ? 'Hide filters' : 'Filters'}{activeFilters > 0 ? ` (${activeFilters} active)` : ''}
      </button>
        </div>
      </div>

      {filtersOpen && (
        <div id="report-filters" className="filters card" role="group" aria-label="Filters">
          <Select label="Status" value={f.status} onChange={set('status')} options={REPORT_STATUSES.map((s) => [s, s] as const)} />
          <Select label="Type" value={f.type} onChange={set('type')} options={REPORT_TYPES.map((s) => [s, s] as const)} />
          <Select label="Priority" value={f.priority} onChange={set('priority')} options={PRIORITIES.map((s) => [s, s] as const)} />
          <Select label="Verification" value={f.verified} onChange={set('verified')} options={[['verified', 'Verified'], ['pending', 'Pending']]} />
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          Could not load reports. Check your connection and try again.{' '}
          <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
        </p>
      )}
      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="No reports match these filters"
          body="Clear a filter to see more reports, or wait for new reports to arrive."
        />
      )}
      {rows.length > 0 && (
        <DataTable<Report>
          columns={queueColumns}
          rows={rows}
          rowKey={(r) => r.id}
          empty={null}
        />
      )}
      </section>
    </div>
  );
}
