import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from './useReports';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import { isOpen, formatTime } from './format';
import { REPORT_TYPES, PRIORITIES, REPORT_STATUSES } from '../../types/domain';

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

export default function ReportQueue() {
  const { reports, loading, error } = useReports();
  const [f, setF] = useState<Filters>({ status: '', type: '', priority: '', verified: '' });
  const set = (k: keyof Filters) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const rows = reports.filter((r) =>
    (!f.status || r.status === f.status)
    && (!f.type || r.type === f.type)
    && (!f.priority || r.priority === f.priority)
    && (!f.verified || (f.verified === 'verified') === Boolean(r.verified)));

  const cards: [string, number][] = [
    ['Total', reports.length],
    ['Open', reports.filter(isOpen).length],
    ['Critical', reports.filter((r) => r.priority === 'critical' && isOpen(r)).length],
    ['Verified', reports.filter((r) => r.verified).length],
  ];

  return (
    <div>
      <div className="summary">
        {cards.map(([label, n]) => (
          <div className="card summary__card" key={label}>
            <span className="summary__label">{label}</span>
            <strong className="summary__value">{n}</strong>
          </div>
        ))}
      </div>

      <div className="filters card" role="group" aria-label="Filters">
        <Select label="Status" value={f.status} onChange={set('status')} options={REPORT_STATUSES.map((s) => [s, s] as const)} />
        <Select label="Type" value={f.type} onChange={set('type')} options={REPORT_TYPES.map((s) => [s, s] as const)} />
        <Select label="Priority" value={f.priority} onChange={set('priority')} options={PRIORITIES.map((s) => [s, s] as const)} />
        <Select label="Verification" value={f.verified} onChange={set('verified')} options={[['verified', 'Verified'], ['pending', 'Pending']]} />
      </div>

      {error && <p className="error" role="alert">Could not load reports. Check your connection and try again.</p>}
      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="card empty">No reports match these filters.</p>
      )}
      {rows.length > 0 && (
        <ul className="queue" aria-label="Reports, newest first">
          {rows.map((r) => (
            <li key={r.id} className="queue__row card">
              <Link to={`/incidents/${r.id}`} className="queue__link">
                <span className="queue__type">{r.type}</span>
                <span className="queue__desc">{r.description}</span>
              </Link>
              <span className="queue__meta">
                <StatusBadge status={r.status} />
                <PriorityBadge priority={r.priority} />
                <VerifiedBadge verified={r.verified} />
                <time>{formatTime(r.createdAt)}</time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
