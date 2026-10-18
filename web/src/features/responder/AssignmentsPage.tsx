import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import type { GeoPoint, Report } from '../../types/domain';
import { useAssignedReports } from './useAssignedReports';
import { useAcknowledgedAt } from '../reports/useReport';
import EmptyState from '../../components/calm/EmptyState';
import OperationForm, { allowedOperationStatuses } from './OperationForm';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { formatTime } from '../reports/format';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.status === 409) return 'This report is closed and can no longer be acknowledged.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm your acknowledgement. Reload your assignments to check before trying again.';
}

function mapsUrl(loc: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}

interface AssignedCardProps {
  report: Report;
}

function AssignedCard({ report }: AssignedCardProps) {
  const [openForm, setOpenForm] = useState(false);
  const canPostUpdate = allowedOperationStatuses(report.status).length > 0;
  // Once a responder has acknowledged, show that instead of offering the button again (avoids duplicate entries).
  const acknowledgement = useAcknowledgedAt(report.id);
  const [accepted, setAccepted] = useState(false);
  const acknowledging = useRef(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const loc = report.location;
  const hasLoc = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

  async function acknowledge() {
    if (acknowledging.current || accepted || acknowledgement.loading || acknowledgement.error || acknowledgement.acknowledged) return;
    acknowledging.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${report.id}/acknowledge`, { method: 'POST' });
      setAccepted(true);
      setMessage({ kind: 'ok', text: 'Assignment acknowledged.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      acknowledging.current = false;
      setBusy(false);
    }
  }

  return (
    <li className="card assignment">
      <div className="assignment__main">
        <div className="assignment__heading">
        <h2 className="queue__type">{report.type} report</h2>
        <div className="incident__badges"><PriorityBadge priority={report.priority} /><StatusBadge status={report.status} /></div>
        </div>
        <span className="plain">{report.description}</span>
        <dl>
          <div className="fact"><dt>Address</dt><dd><span className="plain">{report.addressText || 'No address given'}</span></dd></div>
          <div className="fact"><dt>Location</dt><dd>
            {hasLoc ? (
              <>
                {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}{' '}
                <a className="touch-link" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">Open in maps</a>
              </>
            ) : 'Not available'}
          </dd></div>
          <div className="fact"><dt>Reported</dt><dd>{formatTime(report.createdAt)}</dd></div>
        </dl>
        {message && (
          message.kind === 'ok'
            ? <Banner tone="info" role="status">{message.text}</Banner>
            : <Banner tone="error" role="alert">{message.text}</Banner>
        )}
        <div className="actions__row">
          {accepted || acknowledgement.acknowledged
            ? <p className="plain assignment__acknowledged"><Check size={16} aria-hidden="true" /> Acknowledged {acknowledgement.at ? formatTime(acknowledgement.at) : ''}</p>
            : acknowledgement.loading ? <p role="status">Checking acknowledgement…</p>
            : acknowledgement.error ? <Banner tone="error" role="alert">Could not check acknowledgement. Reload before acknowledging this assignment. <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>Reload assignments</button></Banner>
            : <button type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={acknowledge}>{busy ? 'Acknowledging…' : 'Acknowledge'}</button>}
          {canPostUpdate && (
            <button type="button" className="btn btn--ghost" aria-expanded={openForm}
              onClick={() => setOpenForm((v) => !v)}>
              {openForm ? 'Hide operation form' : 'Post an update'}
            </button>
          )}
        </div>
        {canPostUpdate && openForm && <OperationForm reportId={report.id} reportStatus={report.status} />}
      </div>
    </li>
  );
}

export default function AssignmentsPage() {
  const { team } = useAuth();
  const { reports, loading, error, retry } = useAssignedReports(team);

  if (!team) {
    return (
      <EmptyState
        title="Your account is not linked to a rescue team"
        body="Ask a dispatcher to assign you to a team. Assignments appear here once you have one."
      />
    );
  }
  return (
    <div>
      {error && (
        <Banner tone="error" role="alert">
          Could not load your assignments. Check your connection and try again.{' '}
          <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
        </Banner>
      )}
      {loading && <Skeleton label="Loading assignments"><SkeletonRows rows={2} height={220} /></Skeleton>}
      {!loading && !error && reports.length === 0 && (
        <EmptyState
          title="No open assignments right now"
          body="New assignments from your dispatcher appear here."
        />
      )}
      {reports.length > 0 && (
        <ul className="queue" aria-label="Assigned incidents, newest first">
          {reports.map((r) => <AssignedCard key={r.id} report={r} />)}
        </ul>
      )}
    </div>
  );
}
