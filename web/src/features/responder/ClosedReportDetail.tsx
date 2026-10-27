import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import type { GeoPoint, Report } from '../../types/domain';
import { useReport, useReportUpdates, type RescueUpdate } from '../reports/useReport';
import ActivityHistory, { ActivityNote } from '../../components/calm/ActivityHistory';
import EmptyState from '../../components/calm/EmptyState';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { formatTime, isOpen } from '../reports/format';

function mapsUrl(loc: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}

// Read-only view of a closed report for the responder's own team. It renders no form, segment,
// note, acknowledge or close control, so it cannot change anything. Keep it separate from IncidentDetails.
export function ClosedReportDetail({ report, updates, historyError, historyLoading = false, hasMore = false, onLoadOlder, onRetryHistory }: {
  report: Report;
  updates: RescueUpdate[];
  historyError?: boolean;
  historyLoading?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => void;
  onRetryHistory?: () => void;
}) {
  const loc = report.location;
  const hasLoc = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
  return (
    <article className="card assignment closed-report">
      <div className="assignment__heading">
        <h2 className="queue__type">{report.type} report</h2>
        <div className="incident__badges"><PriorityBadge priority={report.priority} /><StatusBadge status={report.status} /></div>
      </div>
      <p className="plain">Closed. Read only.</p>
      <p className="plain">{report.description}</p>
      <dl>
        {report.reference && <div className="fact"><dt>Reference</dt><dd>{report.reference}</dd></div>}
        <div className="fact"><dt>Address</dt><dd><span className="plain">{report.addressText || 'No address given'}</span></dd></div>
        <div className="fact"><dt>Location</dt><dd>
          {hasLoc ? (
            <>
              {report.placeName || report.area || 'Place not named'}{' '}
              <a className="touch-link" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">Open in maps</a>
            </>
          ) : 'Not available'}
        </dd></div>
        <div className="fact"><dt>Reported</dt><dd>{formatTime(report.createdAt)}</dd></div>
        <div className="fact"><dt>Closed</dt><dd>{formatTime(report.updatedAt)}</dd></div>
      </dl>
      <section aria-labelledby="closed-history-heading">
        <h3 id="closed-history-heading" className="queue__type">Progress history</h3>
        {historyError && (
          <Banner tone="error" role="alert">
            Could not load the progress history.{' '}
            <button type="button" className="btn btn--ghost" onClick={onRetryHistory}>Try again</button>
          </Banner>
        )}
        {historyLoading && <p className="plain" role="status">Loading progress history</p>}
        {!historyError && !historyLoading && updates.length === 0 && <p className="plain">No progress entries were recorded.</p>}
        {updates.length > 0 && (
          // Same disclosure as the resident and incident histories: the newest five, then older entries on request.
          <ActivityHistory
            updates={updates}
            listClassName="closed-history"
            hasMore={hasMore && !historyLoading && !historyError}
            onLoadOlder={onLoadOlder}
            renderItem={(u) => (
              <>
                <strong>{u.status}</strong>
                {u.peopleRescued > 0 && <span className="plain"> · {u.peopleRescued} rescued</span>}
                {u.note && <ActivityNote text={u.note} />}
                <time dateTime={u.at ? u.at.toISOString() : undefined}>{u.at ? formatTime(u.at) : 'Time unknown'}</time>
              </>
            )}
          />
        )}
      </section>
    </article>
  );
}

// Route page for /assignments/:id (responders only). Shows a closed report of the current team,
// redirects an open report to the live list, and gives the same recovery for any report the team cannot see.
export default function ClosedReportPage() {
  const { id = '' } = useParams();
  const { team, user, role } = useAuth();
  const { report, loading, error, notFound } = useReport(id);
  const history = useReportUpdates(id, `${user?.uid ?? ''}|${role ?? ''}|${team ?? ''}`);

  if (!team) {
    return (
      <EmptyState
        title="Your account is not linked to a rescue team"
        body="Ask your administrator to assign you to a team. Assignments appear here once you have one."
      />
    );
  }
  if (loading) return <Skeleton label="Loading report"><SkeletonRows rows={2} height={220} /></Skeleton>;
  if (error || notFound || !report || report.assignedTeamId !== team) {
    return (
      <EmptyState
        title="Report not available to your team"
        body="This report is not on your team's assignments. The link may be outdated, or the report may belong to another team."
        action={<Link className="btn btn--ghost" to="/assignments">Back to assignments</Link>}
      />
    );
  }
  if (isOpen(report)) return <Navigate to="/assignments" replace />;
  return (
    <ClosedReportDetail
      report={report}
      updates={history.updates}
      historyError={!!history.error}
      historyLoading={history.loading}
      hasMore={history.hasMore}
      onLoadOlder={history.loadOlder}
      onRetryHistory={history.retry}
    />
  );
}
