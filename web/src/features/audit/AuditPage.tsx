import { useEffect, useState, type ChangeEvent } from 'react';
import { api } from '../../api/client';

interface AuditEntry {
  actorUid?: string;
  action?: string;
  reportId?: string;
  at?: unknown;
  before?: unknown;
  after?: unknown;
}

interface AuditFilters {
  reportId: string;
  actorUid: string;
  action: string;
  from: string;
  to: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// Strings show as written. Other values show as JSON. Everything is rendered as text, never as markup.
function formatValue(v: unknown): string {
  if (v === undefined) return '(none)';
  if (typeof v === 'string') return v;
  return JSON.stringify(v) ?? String(v);
}

function changedFields(before: unknown, after: unknown): { field: string; before: unknown; after: unknown }[] {
  if (!isRecord(before) && !isRecord(after)) {
    return formatValue(before) === formatValue(after) ? [] : [{ field: 'value', before, after }];
  }
  const b = isRecord(before) ? before : {};
  const a = isRecord(after) ? after : {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys
    .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({ field: k, before: b[k], after: a[k] }));
}

function formatTime(v: unknown): string {
  if (typeof v !== 'string' && typeof v !== 'number') return '(unknown)';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

interface Result {
  key: string;
  rows?: AuditEntry[];
  error?: boolean;
}

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ reportId: '', actorUid: '', action: '', from: '', to: '' });
  const params = new URLSearchParams();
  for (const key of ['reportId', 'actorUid', 'action', 'from', 'to'] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const requestQuery = params.toString();

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    api(`/audit${requestQuery ? `?${requestQuery}` : ''}`)
      .then((data) => { if (!cancelled) setResult({ key: requestQuery, rows: Array.isArray(data) ? (data as AuditEntry[]) : [] }); })
      .catch(() => { if (!cancelled) setResult({ key: requestQuery, error: true }); });
    return () => { cancelled = true; };
  }, [requestQuery]);

  const loading = result?.key !== requestQuery;
  const set = (k: keyof AuditFilters) => (e: ChangeEvent<HTMLInputElement>) =>
    setFilters((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div>
      <form className="filters card" role="group" aria-label="Audit filters" onSubmit={(e) => e.preventDefault()}>
        <div className="filter">
          <label htmlFor="au-report">Report ID</label>
          <input id="au-report" value={filters.reportId} onChange={set('reportId')} />
        </div>
        <div className="filter">
          <label htmlFor="au-actor">Actor UID</label>
          <input id="au-actor" value={filters.actorUid} onChange={set('actorUid')} />
        </div>
        <div className="filter">
          <label htmlFor="au-action">Action</label>
          <input id="au-action" value={filters.action} onChange={set('action')} />
        </div>
        <div className="filter">
          <label htmlFor="au-from">From</label>
          <input id="au-from" type="date" value={filters.from} onChange={set('from')} />
        </div>
        <div className="filter">
          <label htmlFor="au-to">To</label>
          <input id="au-to" type="date" value={filters.to} onChange={set('to')} />
        </div>
      </form>

      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && result?.error && <p role="alert" className="error">Could not load the audit log. Check your connection and try again.</p>}
      {!loading && !result?.error && result?.rows?.length === 0 && (
        <p className="card empty">No audit entries match these filters.</p>
      )}
      {!loading && !result?.error && result?.rows && result.rows.length > 0 && (
        <div className="table-wrap card audit">
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Actor</th>
                <th scope="col">Report</th>
                <th scope="col">Changes (before, after)</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={`${i}-${formatTime(row.at)}-${row.action ?? ''}`}>
                  <td>{formatTime(row.at)}</td>
                  <td>{row.action ?? ''}</td>
                  <td>{row.actorUid ?? ''}</td>
                  <td>{row.reportId ?? ''}</td>
                  <td>
                    <ul className="audit__changes">
                      {changedFields(row.before, row.after).map((c) => (
                        <li key={c.field}>
                          <strong>{c.field}</strong>: <del>{formatValue(c.before)}</del> <ins>{formatValue(c.after)}</ins>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
