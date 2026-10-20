import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import EmptyState from '../../components/calm/EmptyState';
import { useEffect, useState, type ChangeEvent } from 'react';
import { api } from '../../api/client';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { ACTION_NAMES, actionName, fieldName, namedValue, type AuditNames } from './presentation';

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
  const [names, setNames] = useState<AuditNames>({ users: {}, reports: {}, teams: {} });
  const [namesFailed, setNamesFailed] = useState(false);
  const [namesAttempt, setNamesAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.allSettled(['/users', '/reports', '/teams'].map(path => api(path))).then(results => {
      if (!active) return;
      let failed = false;
      const lookup = (index: number, key: string, label: string) => {
        const result = results[index];
        if (result.status !== 'fulfilled' || !Array.isArray(result.value)) { failed = true; return {}; }
        return Object.fromEntries(result.value.filter(row => isRecord(row) && typeof row[key] === 'string' && typeof row[label] === 'string').map(row => [row[key], row[label]]));
      };
      const next = { users: lookup(0, 'uid', 'name'), reports: lookup(1, 'id', 'reference'), teams: lookup(2, 'id', 'name') };
      setNames(next); setNamesFailed(failed);
    });
    return () => { active = false; };
  }, [namesAttempt]);
  const [filters, setFilters] = useState<AuditFilters>({ reportId: '', actorUid: '', action: '', from: '', to: '' });
  const params = new URLSearchParams();
  for (const key of ['reportId', 'actorUid', 'action', 'from', 'to'] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const requestQuery = params.toString();
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (invalidRange) return;
    let cancelled = false;
    const timer = window.setTimeout(() => { void api(`/audit${requestQuery ? `?${requestQuery}` : ''}`)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid audit response');
        if (!cancelled) setResult({ key: requestQuery, rows: data as AuditEntry[] });
      })
      .catch(() => { if (!cancelled) setResult({ key: requestQuery, error: true }); });
    }, requestQuery ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [requestQuery, invalidRange, attempt]);
  const retry = () => { setResult(null); setAttempt((n) => n + 1); };

  const loading = result?.key !== requestQuery;
  const set = (k: keyof AuditFilters) => (e: ChangeEvent<HTMLInputElement>) =>
    setFilters((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div>
      <MotionForm className="filters card" aria-label="Audit filters" onSubmit={(e) => e.preventDefault()}>
        <div className="filter">
          <label htmlFor="au-report">Report ID</label>
          <input id="au-report" value={filters.reportId} onChange={set('reportId')} />
        </div>
        <div className="filter">
          <label htmlFor="au-actor">Account ID</label>
          <input id="au-actor" value={filters.actorUid} onChange={set('actorUid')} />
        </div>
        <div className="filter">
          <label htmlFor="au-action">Action</label>
          <input id="au-action" list="audit-actions" value={filters.action} onChange={set('action')} />
          <datalist id="audit-actions">{Object.entries(ACTION_NAMES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</datalist>
        </div>
        <div className="filter">
          <label htmlFor="au-from">From</label>
          <input id="au-from" type="date" value={filters.from} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'audit-range-error' : undefined} onChange={set('from')} />
        </div>
        <div className="filter">
          <label htmlFor="au-to">To</label>
          <input id="au-to" type="date" value={filters.to} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'audit-range-error' : undefined} onChange={set('to')} />
        </div>
        {Object.values(filters).some(Boolean) && <button type="button" className="btn btn--ghost" onClick={() => { setFilters({ reportId: '', actorUid: '', action: '', from: '', to: '' }); document.getElementById('au-report')?.focus(); }}>Clear audit filters</button>}
      </MotionForm>
      {invalidRange && <FieldError id="audit-range-error" role="alert" className="range-error">The end date must be on or after the start date.</FieldError>}

      {!invalidRange && loading && <Skeleton label="Loading the audit log"><SkeletonRows rows={6} height={44} /></Skeleton>}
      {!invalidRange && !loading && result?.error && (
        <Banner tone="error" role="alert">
          Could not load the audit log. Check your connection and try again.{' '}
          <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
        </Banner>
      )}
      {!invalidRange && !loading && !result?.error && result?.rows?.length === 0 && (
        <EmptyState
          title="No audit entries match these filters"
          body="Audit entries appear here as staff verify, assign, or change reports. Clear the filters to see more."
        />
      )}
      {!invalidRange && !loading && !result?.error && result?.rows && result.rows.length > 0 && (
        <>
        {namesFailed && <p className="field-hint" role="status">Some names or references could not be loaded. Original IDs are shown instead. <button type="button" className="btn btn--ghost" onClick={() => setNamesAttempt(value => value + 1)}>Retry names</button></p>}
        <p className="scroll-cue">Swipe sideways to see every column.</p>
        <div className="table-wrap card audit" tabIndex={0} role="region" aria-label="Audit entries">
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
                  <td>{row.action ? actionName(row.action) : 'Not recorded'}<details className="audit__identifiers"><summary>Identifiers</summary><dl><dt>Action code</dt><dd>{row.action || 'Not recorded'}</dd><dt>Account ID</dt><dd>{row.actorUid || 'Not recorded'}</dd><dt>Report ID</dt><dd>{row.reportId || 'Not recorded'}</dd></dl></details></td>
                  <td>{row.actorUid ? names.users[row.actorUid] || row.actorUid : 'Not recorded'}</td>
                  <td>{row.reportId ? names.reports[row.reportId] || (isRecord(row.after) && typeof row.after.reference === 'string' ? row.after.reference : row.reportId) : 'Not recorded'}</td>
                  <td>
                    <ul className="audit__changes">
                      {changedFields(row.before, row.after).map((c) => (
                        <li key={c.field}>
                          <strong>{fieldName(c.field)}</strong>: <del>{namedValue(c.field, c.before, names)}</del> <span aria-hidden="true">→</span><span className="sr-only"> changed to </span> <ins>{namedValue(c.field, c.after, names)}</ins>
                        </li>
                      ))}
                    </ul>
                    {changedFields(row.before, row.after).length === 0 && <span className="field-hint">No field details recorded.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
