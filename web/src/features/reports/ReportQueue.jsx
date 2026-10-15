import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from './useReports.js';
import StatusBadge from './StatusBadge.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import { TYPES, PRIORITIES, STATUSES, isOpen, formatTime } from './format.js';

function Select({ label, value, onChange, options }) {
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

export default function ReportQueue() {
  const { reports, loading, error } = useReports();
  const [f, setF] = useState({ status: '', type: '', priority: '', verified: '' });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const rows = reports.filter((r) =>
    (!f.status || r.status === f.status)
    && (!f.type || r.type === f.type)
    && (!f.priority || r.priority === f.priority)
    && (!f.verified || (f.verified === 'verified') === Boolean(r.verified)));

  const cards = [
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
        <Select label="Status" value={f.status} onChange={set('status')} options={STATUSES.map((s) => [s, s])} />
        <Select label="Type" value={f.type} onChange={set('type')} options={TYPES.map((s) => [s, s])} />
        <Select label="Priority" value={f.priority} onChange={set('priority')} options={PRIORITIES.map((s) => [s, s])} />
        <Select label="Verification" value={f.verified} onChange={set('verified')} options={[['verified', 'Verified'], ['pending', 'Pending']]} />
      </div>

      {error && <p className="error" role="alert">Could not load reports. Check your connection and try again.</p>}
      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && rows.length === 0 && (
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
