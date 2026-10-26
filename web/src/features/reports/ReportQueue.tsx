import ReportWindow from '../../components/ReportWindow';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAwaitingReports } from './useAwaitingReports';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import IncidentPreview from './IncidentPreview';
import { isOpen, formatTime } from './format';
import { orderQueue } from './queueOrder';
import { awaitingVerify, canActOnReports } from './workflow';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import { REPORT_TYPES, PRIORITIES, REPORT_STATUSES } from '../../types/domain';
import EmptyState from '../../components/calm/EmptyState';
import Card from '../../components/calm/Card';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { MapPin, Waves, Flame, Building2, Mountain, CircleHelp, SlidersHorizontal, Search } from 'lucide-react';

type Report = ReturnType<typeof useAwaitingReports>['reports'][number];

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

interface Reporter { name?: string | null; phone?: string | null }

function InboxRow({ r, selected, onSelect, reporter }: { r: Report; selected: boolean; onSelect: () => void; reporter?: Reporter }) {
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
          <span className="inbox__reporter">Reported by {reporter?.name || 'name not recorded'}{reporter?.phone ? ` · ${reporter.phone}` : ''}</span>
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
  const { reports, loading, error, fromCache, retry, windowSize, loadMore } = useAwaitingReports();
  // Reporter names come from the admin directory, not the report record, so responders never see them.
  const [people, setPeople] = useState<Record<string, Reporter>>({});
  useEffect(() => {
    if (role !== 'admin') return;
    let active = true;
    Promise.resolve()
      .then(() => api('/users'))
      .then((list: unknown) => {
        if (!active || !Array.isArray(list)) return;
        setPeople(Object.fromEntries(list.filter((u): u is Record<string, unknown> & { uid: string } => !!u && typeof (u as { uid?: unknown }).uid === 'string')
          .map((u) => [u.uid, { name: typeof u.name === 'string' ? u.name : null, phone: typeof u.phone === 'string' ? u.phone : null }])));
      })
      .catch(() => { /* names stay hidden; the row says the name was not recorded */ });
    return () => { active = false; };
  }, [role]);
  // Filters, quick view, and selection live in the URL (W08): Back, reload, and shared links restore the same list.
  const [params, setParams] = useSearchParams();
  const f: Filters = {
    status: params.get('status') ?? '',
    type: params.get('type') ?? '',
    priority: params.get('priority') ?? '',
    verified: params.get('verified') ?? '',
  };
  const quickParam = params.get('quick');
  const quick: Quick = quickParam === 'verify' || quickParam === 'active' ? quickParam : 'all';
  const selectedId = params.get('sel');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Replace, not push: changing a filter or selection should not add a Back step per click.
  const update = (change: (p: URLSearchParams) => void) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    change(next);
    return next;
  }, { replace: true });
  // Set by a user's selection on narrow screens; consumed after the preview has rendered.
  const focusPreviewOnNextRender = useRef(false);
  const setSelectedId = (id: string) => {
    update((p) => p.set('sel', id));
    // On a phone the preview sits below the whole list. Bring it into view when the user picks a report (W03).
    // Only a user's choice moves focus; live list updates never do.
    if (window.matchMedia?.('(max-width: 1199px)').matches) focusPreviewOnNextRender.current = true;
  };
  const set = (k: keyof Filters) => (v: string) => update((p) => { if (v) p.set(k, v); else p.delete(k); });
  const setQuick = (q: Quick) => update((p) => { if (q === 'all') p.delete('quick'); else p.set('quick', q); });
  const clearAll = () => update((p) => {
    for (const k of ['status', 'type', 'priority', 'verified', 'quick'] as const) p.delete(k);
  });

  const activeFilters = Object.values(f).filter(Boolean).length + (quick !== 'all' ? 1 : 0);

  const query = (params.get('q') ?? '').trim().toLowerCase();
  const matchesQuery = (r: Report) => !query || [r.type, r.description, r.addressText ?? '', r.reference ?? '', r.id ?? '']
    .some((text) => text.toLowerCase().includes(query));

  const rows = orderQueue(reports.filter((r) =>
    matchesQuery(r) && quickMatch(r, quick)
    && (!f.status || r.status === f.status)
    && (!f.type || r.type === f.type)
    && (!f.priority || r.priority === f.priority)
    && (!f.verified || (f.verified === 'verified') === Boolean(r.verified))), isActive);

  // First visible report is the default. Once chosen, the selection stays put while the list changes.
  const effectiveId = selectedId ?? rows[0]?.id ?? null;
  useEffect(() => {
    if (!focusPreviewOnNextRender.current) return;
    focusPreviewOnNextRender.current = false;
    document.getElementById('preview-title')?.focus();
  }, [effectiveId]);
  const selected: Report | undefined = reports.find((r) => r.id === effectiveId);
  const selectedHidden = Boolean(selected) && !rows.some((r) => r.id === selected?.id);

  const cards: [string, number][] = [
    ['All reports', reports.length],
    ['Active reports', reports.filter(isActive).length],
    ['Critical', reports.filter((r) => isActive(r) && r.priority === 'critical').length],
    ['Verified', reports.filter((r) => r.verified).length],
  ];
  const quickCount = (q: Quick) => reports.filter((r) => quickMatch(r, q)).length;
  const canAct = canActOnReports(role);
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

      <ConnectionNotice fromCache={fromCache} />
      {!loading && !error && <ReportWindow count={reports.length} windowSize={windowSize} loadMore={loadMore} />}
      <div className="inbox-layout">
      <section className="inbox-panel" aria-labelledby="queue-heading">
        <div className="queue-toolbar">
          <div>
            <h2 id="queue-heading">Incident inbox</h2>
            <p aria-live="polite">{loading ? 'Loading reports…' : failed ? 'Reports unavailable' : `Showing ${rows.length} of ${reports.length} reports`}</p>
            <p className="queue-order">Oldest first. Priority does not change the order.</p>
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

        <div className="inbox-search">
          <label htmlFor="inbox-search">Search incidents</label>
          <input id="inbox-search" type="search" value={params.get('q') ?? ''} placeholder="Search reports…" aria-describedby="inbox-search-hint"
            onChange={(e) => update((p) => { if (e.target.value) p.set('q', e.target.value); else p.delete('q'); })} />
        </div>
        <p id="inbox-search-hint" className="inbox-search-hint">Search by type, place, description, or reference.</p>
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
          <Banner tone="error" role="alert">
            Could not load reports. Check your connection and try again.{' '}
            <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
          </Banner>
        )}
        {loading && <Skeleton label="Loading incident inbox"><SkeletonRows rows={5} height={84} /></Skeleton>}
        {!loading && !error && rows.length === 0 && (
          <EmptyState
            title={reports.length === 0 ? 'No reports received yet' : 'No reports match this view'}
            body={reports.length === 0 ? 'New reports will appear here when they arrive.' : 'Clear your search and filters to see all received reports.'}
            action={(query || activeFilters > 0) ? <button type="button" className="btn btn--ghost" onClick={() => {
              update((p) => { for (const key of ['q', 'status', 'type', 'priority', 'verified', 'quick']) p.delete(key); });
              document.getElementById('inbox-search')?.focus();
            }}>Clear search and filters</button> : undefined}
          />
        )}
        {rows.length > 0 && (
          <ul className="inbox" aria-label="Incident inbox">
            {rows.map((r) => (
              <InboxRow key={r.id} r={r} selected={r.id === effectiveId} onSelect={() => setSelectedId(r.id)} reporter={r.reporterId ? people[r.reporterId] : undefined} />
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
