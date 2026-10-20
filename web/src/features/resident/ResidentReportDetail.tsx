import { ConnectionNotice } from '../../components/ConnectionStatus';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useReport, useReportUpdates } from '../reports/useReport';
import { formatTime } from '../reports/format';
import { resolvePhotoUrl } from '../../lib/photos';
import PhotoImage from '../../components/PhotoImage';
import StatusBadge from '../reports/StatusBadge';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import EmptyState from '../../components/calm/EmptyState';
import Banner from '../../components/calm/Banner';
import ActivityHistory, { ActivityNote } from '../../components/calm/ActivityHistory';
import '../../pages/public.css';
import './resident-motion.css';

const STATUS_GUIDANCE: Record<string, string> = {
  Submitted: 'Your report has been received. Staff review reports before assigning a rescue team.',
  'Under Verification': 'Staff are checking the details of your report. Updates will appear in the history below.',
  Verified: 'Staff have verified your report. A team has not been assigned at this stage.',
  'Awaiting Assignment': 'Your report is waiting for a rescue team to be assigned.',
  'Team Assigned': 'A rescue team has been assigned. Follow the history for response updates.',
  'Rescue in Progress': 'The assigned team has recorded that the rescue is in progress.',
  Resolved: 'The rescue has been recorded as resolved. Staff may add a final update before closing the report.',
  Closed: 'Staff have closed this report. You can still review what you submitted and its history.',
  Cancelled: 'This report has been cancelled.',
  Rejected: 'Staff have rejected this report. Review any reason provided below.',
  Duplicate: 'Staff have marked this report as a duplicate of another report.',
};

const CANCEL_REFUSED = 'This report can no longer be cancelled. It may already have been verified. The list has been refreshed.';

export default function ResidentReportDetail() {
  const { id = '' } = useParams();
  const { report, loading, error, fromCache, retry } = useReport(id);
  const { updates, loading: updatesLoading, error: updatesError, retry: retryUpdates, hasMore: updatesHasMore, loadOlder: loadOlderUpdates } = useReportUpdates(id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // A denied direct read deliberately cannot reveal whether a foreign/missing ID exists.
  const unavailable = error?.code === 'permission-denied';
  // A failed read is not a missing report. "Not found" appears only after a successful read.
  if (!report) {
    return (
      <div className="resident">
        {loading && <Skeleton label="Loading report"><SkeletonRows rows={3} height={80} /></Skeleton>}
        {!loading && error && !unavailable && (
          <Banner tone="error" role="alert">
            We could not load this report. Check your connection and try again.{' '}
            <button type="button" className="btn btn--ghost" onClick={retry}>Try again</button>
          </Banner>
        )}
        {!loading && (!error || unavailable) && <EmptyState title="We could not find this report." body="It may have been removed, or the link may belong to another account. Return to your reports to choose an available report." />}
        <Link className="touch-link" to="/my">Back to my reports</Link>
      </div>
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
      setMessage({ tone: 'error', text: status === 409 ? CANCEL_REFUSED : 'Could not confirm the cancellation. Check the current status before trying again.' });
    } finally {
      setBusy(false);
      retry();
    }
  }

  return (
    <div className="resident">
      <p><Link className="touch-link" to="/my">Back to my reports</Link></p>
      <ConnectionNotice fromCache={fromCache} />
      <div className="resident-detail-grid">
      <section className="card" aria-labelledby="report-title">
        <h2 id="report-title">{report.type.charAt(0).toUpperCase() + report.type.slice(1)} report</h2>
        <p className="resident-detail__reference">Reference: {report.reference || report.id}</p>
        <StatusBadge status={report.status} />
        <p className="resident-detail__guidance">{STATUS_GUIDANCE[report.status] || 'Follow the status history for updates from staff.'}</p>
        <dl className="resident-report-facts">
          <div><dt>Submitted</dt><dd>{formatTime(report.createdAt)}</dd></div>
          <div><dt>Address or landmark</dt><dd>{report.addressText || 'No address provided'}</dd></div>
        </dl>
        <h3>What you reported</h3>
        <p className="resident-detail__description">{report.description}</p>
        {report.rejectionReason && <div className="resident-detail__guidance"><h3>Reason from staff</h3><p>{report.rejectionReason}</p></div>}
        {report.photos?.length > 0 && <div className="resident-evidence"><h3>Attached photos</h3><ul className="resident-evidence__list">{report.photos.map((photo, index) => <li key={photo.url}><a href={resolvePhotoUrl(photo.url)} target="_blank" rel="noopener noreferrer" aria-label={`Open attached photo ${index + 1} in a new tab`}><PhotoImage src={resolvePhotoUrl(photo.url)} /><span>Photo {index + 1}</span></a></li>)}</ul></div>}
        {message && <Banner tone={message.tone === 'ok' ? 'info' : 'error'} role={message.tone === 'ok' ? 'status' : 'alert'}>{message.text}</Banner>}
        {report.status === 'Submitted' && (
          <div className="resident-detail__cancel">
            <p>You can cancel this report until staff verify it. After that, cancelling is no longer possible.</p>
            <button type="button" className="btn btn--ghost" onClick={cancel} aria-disabled={busy} aria-busy={busy}>Cancel report</button>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="history-title">
        <h2 id="history-title">Report activity</h2>
        <ol className="resident-activity">
          <li><strong>Report submitted</strong><time>{formatTime(report.createdAt)}</time></li>
          {report.status !== 'Submitted' && <li><strong>Latest status: {report.status}</strong></li>}
        </ol>
        <h3>Response updates</h3>
        <p className="field-hint">Updates posted by the response team appear below.</p>
        {updatesLoading && updates.length === 0 && <Skeleton label="Loading response updates"><SkeletonRows rows={2} height={48} /></Skeleton>}
        {updatesError && (
          <Banner tone="error" role="alert">
            Could not load the latest updates.{' '}
            <button type="button" className="btn btn--ghost" onClick={retryUpdates}>Try again</button>
          </Banner>
        )}
        {updates.length === 0 && !updatesLoading && !updatesError && <p className="field-hint">No response updates have been posted yet.</p>}
        {updates.length > 0 && (
          <ActivityHistory
            updates={updates}
            listClassName="resident__list response-updates"
            hasMore={updatesHasMore}
            onLoadOlder={loadOlderUpdates}
            renderItem={(u) => (
              <>
                <strong>{u.status}</strong> <span>{u.at ? formatTime(u.at) : ''}</span>
                {u.note && <ActivityNote text={u.note} />}
              </>
            )}
          />
        )}
      </section>
      </div>
    </div>
  );
}
