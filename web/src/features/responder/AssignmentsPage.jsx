import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { api, ApiError } from '../../api/client.js';
import { useAssignedReports } from './useAssignedReports.js';
import OperationForm from './OperationForm';
import StatusBadge from '../reports/StatusBadge.jsx';
import PriorityBadge from '../reports/PriorityBadge.jsx';
import { formatTime } from '../reports/format.js';

function errorText(err) {
  if (err instanceof ApiError || (err && typeof err.status === 'number')) {
    if (err.status === 409) return 'This report is closed and can no longer be acknowledged.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function mapsUrl(loc) {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}

function AssignedCard({ report }) {
  const [openForm, setOpenForm] = useState(false);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const loc = report.location;
  const hasLoc = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

  async function acknowledge() {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${report.id}/acknowledge`, { method: 'POST' });
      setMessage({ kind: 'ok', text: 'Assignment acknowledged.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="queue__row card assignment">
      <div className="assignment__main">
        <span className="queue__type">{report.type}</span>
        <span className="plain">{report.description}</span>
        <dl>
          <div className="fact"><dt>Address</dt><dd><span className="plain">{report.addressText || 'No address given'}</span></dd></div>
          <div className="fact"><dt>Location</dt><dd>
            {hasLoc ? (
              <>
                {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}{' '}
                <a href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">Open in maps</a>
              </>
            ) : 'Not available'}
          </dd></div>
          <div className="fact"><dt>Reported</dt><dd>{formatTime(report.createdAt)}</dd></div>
        </dl>
        <div className="incident__badges">
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
        </div>
        {message && (
          message.kind === 'ok'
            ? <p role="status" className="success">{message.text}</p>
            : <p role="alert" className="error"><span aria-hidden="true">✖</span> {message.text}</p>
        )}
        <div className="actions__row">
          <button type="button" className="btn" disabled={busy} onClick={acknowledge}>Acknowledge</button>
          <button type="button" className="btn btn--ghost" aria-expanded={openForm}
            onClick={() => setOpenForm((v) => !v)}>
            {openForm ? 'Hide operation form' : 'Post an update'}
          </button>
        </div>
        {openForm && <OperationForm reportId={report.id} />}
      </div>
    </li>
  );
}

export default function AssignmentsPage() {
  const { team } = useAuth();
  const { reports, loading, error } = useAssignedReports(team);

  if (!team) {
    return <p className="card empty">Your account is not linked to a rescue team yet. Ask a dispatcher to assign you one.</p>;
  }
  return (
    <div>
      {error && <p role="alert" className="error"><span aria-hidden="true">✖</span> Could not load your assignments. Check your connection and try again.</p>}
      {loading && <p role="status" className="loading">Loading...</p>}
      {!loading && !error && reports.length === 0 && (
        <p className="card empty">No open assignments right now.</p>
      )}
      {reports.length > 0 && (
        <ul className="queue" aria-label="Assigned incidents, newest first">
          {reports.map((r) => <AssignedCard key={r.id} report={r} />)}
        </ul>
      )}
    </div>
  );
}
