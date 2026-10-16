import { useState } from 'react';
import { useReports } from './useReports';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import IncidentPreview from './IncidentPreview';
import { isOpen, formatTime } from './format';
import { awaitingVerify } from './workflow';
import { useAuth } from '../../auth/AuthProvider';
import { REPORT_TYPES, PRIORITIES, REPORT_STATUSES } from '../../types/domain';
import EmptyState from '../../components/calm/EmptyState';
import Card from '../../components/calm/Card';
import { MapPin, Waves, Flame, Building2, Mountain, CircleHelp, SlidersHorizontal, Search } from 'lucide-react';

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

const NO_FILTERS: Filters = { status: '', type: '', priority: '', verified: '' };

// Quick views are derived from the full dataset; counts never depend on the visible results.
type Quick = 'all' | 'verify' | 'active';
const QUICK: ReadonlyArray<readonly [Quick, string]> = [
  ['all', 'All reports'],
  ['verify', 'Needs verification'],
  ['active', 'Active'],
];

const isActive = (r: Report): boolean => isOpen(r) && r.status !== 'Resolved';

const quickMatch = (r: Report, quick: Quick): boolean => {
  if (quick === 'verify') return awaitingVerify(r);
  if (quick === 'active') return isActive(r);
  return true;
};

const TYPE_ICONS = { flood: Waves, fire: Flame, earthquake: Building2, landslide: Mountain, other: CircleHelp };
const TYPE_CLASS = { flood: 'type-icon--flood', fire: 'type-icon--fire', earthquake: 'type-icon--earthquake', landslide: 'type-icon--landslide', other: 'type-icon--other' };

function InboxRow({ r, selected, onSelect }: { r: Report; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_ICONS[r.type as keyof typeof TYPE_ICONS] || CircleHelp;
  const typeClass = TYPE_CLASS[r.type as keyof typeof TYPE_CLASS] || 'type-icon--other';
  const label = r.type.charAt(0).toUpperCase() + r.type.slice(1);
  return (
    <li>
      <button
        type="button"
        className={`inbox__row${selected ? ' is-selected' : ''}${r.priority === 'critical' ? ' inbox__row--critical' : ''}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        <span className={`type-icon ${typeClass}`} aria-hidden="true"><Icon /></span>
        <span className="inbox__main">
          <span className="inbox__title">
            <strong>{label}</strong>
            <PriorityBadge priority={r.priority} />
          </span>
          <span className="inbox__place"><MapPin aria-hidden="true" /> {r.addressText || 'No address given'}</span>
          <span className="inbox__desc">{r.description}</span>
        </span>
        <span className="inbox__side">
          <time>{formatTime(r.createdAt)}</time>
          <StatusBadge status={r.status} />
          <VerifiedBadge verified={r.verified} />
        </span>
      </button>
    </li>
  );
}

export default function ReportQueue() {
  const { role } = useAuth();
  const { reports, loading, error, retry } = useReports();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [quick, setQuick] = useState<Quick>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeFilters = Object.values(f).filter(Boolean).length + (quick !== 'all' ? 1 : 0);
  const set = (k: keyof Filters) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const clearAll = () => { setF(NO_FILTERS); setQuick('all'); };

  const rows = reports.filter((r) =>
    quickMatch(r, quick)
    && (!f.status || r.status === f.status)
    && (!f.type || r.type === f.type)
    && (!f.priority || r.priority === f.priority)
    && (!f.verified || (f.verified === 'verified') === Boolean(r.verified)));

  // First visible report is the default. Once chosen, the selection stays put while the list changes.
  const effectiveId = selectedId ?? rows[0]?.id ?? null;
  const selected: Report | undefined = reports.find((r) => r.id === effectiveId);
  const selectedHidden = Boolean(selected) && !rows.some((r) => r.id === selected?.id);

  const cards: [string, number][] = [
    ['All reports', reports.length],
    ['Active reports', reports.filter(isActive).length],
    ['Critical', reports.filter((r) => isActive(r) && r.priority === 'critical').length],
    ['Verified', reports.filter((r) => r.verified).length],
  ];
  const quickCount = (q: Quick) => reports.filter((r) => quickMatch(r, q)).length;
  const canAct = role === 'dispatcher';
  const failed = Boolean(error);

  return (
    <div className="overview">
      <div className="summary" aria-label="Workload">
        {cards.map(([label, n]) => (
          <Card key={label} className="summary__card">
            <span className="summary__label">{label}</span>
            <strong className="summary__value">{loading || failed ? '—' : n}</strong>
          </Card>
        ))}
      </div>

      <div className="inbox-layout">
      <section className="inbox-panel" aria-labelledby="queue-heading">
        <div className="queue-toolbar">
          <div>
            <h2 id="queue-heading">Incident inbox</h2>
            <p aria-live="polite">{loading ? 'Loading reports…' : failed ? 'Reports unavailable' : `Showing ${rows.length} of ${reports.length} reports · newest first`}</p>
          </div>
          <div className="queue-toolbar__actions">
            {activeFilters > 0 && <button type="button" className="btn btn--ghost" onClick={clearAll}>Clear filters</button>}
            <button type="button" className="btn btn--ghost filters__toggle" aria-expanded={filtersOpen} aria-controls="report-filters"
              onClick={() => setFiltersOpen((v) => !v)}>
              <SlidersHorizontal aria-hidden="true" />
              {filtersOpen ? 'Hide filters' : 'Filters'}{activeFilters > 0 ? ` (${activeFilters} active)` : ''}
            </button>
          </div>
        </div>

        <div className="quick" role="group" aria-label="Quick views">
          {QUICK.map(([key, text]) => (
            <button key={key} type="button" className="quick__chip" aria-pressed={quick === key}
              onClick={() => setQuick(key)}>
              {text} <span className="quick__count">({quickCount(key)})</span>
            </button>
          ))}
        </div>

        {filtersOpen && (
          <div id="report-filters" className="filters" role="group" aria-label="Filters">
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
          <ul className="inbox" aria-label="Incident inbox">
            {rows.map((r) => (
              <InboxRow key={r.id} r={r} selected={r.id === effectiveId} onSelect={() => setSelectedId(r.id)} />
            ))}
          </ul>
        )}
      </section>

      <aside className="inbox-preview" aria-label="Selected report">
        {selected ? (
          <IncidentPreview key={selected.id} report={selected} canAct={canAct}
            outsideFilters={selectedHidden} onClearFilters={clearAll} />
        ) : (
          !loading && !failed && (
            <p className="preview__empty"><Search aria-hidden="true" /> {selectedId ? 'This report is no longer available.' : 'Select a report to see its details.'}</p>
          )
        )}
      </aside>
      </div>
    </div>
  );
}
