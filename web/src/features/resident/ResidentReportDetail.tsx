import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import { useMyReports } from './useMyReports';
import { useReportUpdates } from '../reports/useReport';
import { formatTime } from '../reports/format';
import StatusBadge from '../reports/StatusBadge';
import Banner from '../../components/calm/Banner';
import '../../pages/public.css';

const CANCEL_REFUSED = 'This report can no longer be cancelled. It may already have been verified. The list has been refreshed.';

export default function ResidentReportDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { reports, loading, retry } = useMyReports(user?.uid ?? '');
  const { updates } = useReportUpdates(id);
  const report = reports.find((r) => r.id === id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (!report) {
    return (
      <main className="resident">
        <p>{loading ? 'Loading report...' : 'We could not find this report.'}</p>
        <Link to="/my">Back to my reports</Link>
      </main>
    );
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${id}/cancel`, { method: 'PATCH', body: {} });
      setMessage({ tone: 'ok', text: 'Your report was cancelled.' });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setMessage({ tone: 'error', text: status === 409 ? CANCEL_REFUSED : 'Could not cancel the report. Try again.' });
    } finally {
      setBusy(false);
      retry();
    }
  }

  return (
    <main className="resident">
      <p><Link to="/my">Back to my reports</Link></p>
      <section className="card" aria-labelledby="report-title">
        <h1 id="report-title">{report.type.charAt(0).toUpperCase() + report.type.slice(1)} report</h1>
        <p>Reference: {report.reference}</p>
        <StatusBadge status={report.status} />
        <p>Submitted {formatTime(report.createdAt)}</p>
        {report.addressText && <p>Address or landmark: {report.addressText}</p>}
        <p>{report.description}</p>
        {message && <Banner tone={message.tone === 'ok' ? 'info' : 'error'} role="status">{message.text}</Banner>}
        {report.status === 'Submitted' && (
          <button type="button" className="btn btn--ghost" onClick={cancel} disabled={busy}>Cancel report</button>
        )}
      </section>

      <section className="card" aria-labelledby="history-title">
        <h2 id="history-title">Status history</h2>
        {updates.length === 0 && <p>No updates yet.</p>}
        <ol className="resident__list">
          {updates.map((u) => (
            <li key={u.id}>
              <strong>{u.status}</strong> <span>{u.at ? formatTime(u.at) : ''}</span>
              {u.note && <p>{u.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
