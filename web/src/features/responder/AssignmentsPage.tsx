import ReportWindow from '../../components/ReportWindow';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import type { GeoPoint, Report } from '../../types/domain';
import { Link } from 'react-router-dom';
import { useAssignedReports } from './useAssignedReports';
import { useClosedTeamReports } from './useClosedTeamReports';
import { useAcknowledgedAt, useReport } from '../reports/useReport';
import EmptyState from '../../components/calm/EmptyState';
import OperationForm, { allowedOperationStatuses } from './OperationForm';
import TeamSummary from './TeamSummary';
import AssignedProgress from './AssignedProgress';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { formatTime, isOpen } from '../reports/format';
import { clearDraft, getDraft, hasContent, saveDraft, useDrafts, type Draft } from './draftStore';
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
  // The signed-in identity. A change drops the card's history and unsubscribes it.
  scope: string;
}

function AssignedCard({ report, scope }: AssignedCardProps) {
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
          {(canPostUpdate || openForm) && (
            <button type="button" className="btn btn--ghost" aria-expanded={openForm}
              onClick={() => setOpenForm((v) => !v)}>
              {openForm ? 'Hide operation form' : 'Post an update'}
            </button>
          )}
        </div>
        {openForm && <OperationForm reportId={report.id} reportStatus={report.status} closed={!canPostUpdate} />}
        <AssignedProgress reportId={report.id} scope={scope} />
      </div>
    </li>
  );
}

// Read-only: a closed report has no status, note, acknowledge or close controls.
function ClosedRow({ report }: { report: Report }) {
  return (
    <li className="card assignment closed-assignment">
      <div className="assignment__heading">
        <h3 className="queue__type">{report.type} report</h3>
        <div className="incident__badges"><StatusBadge status={report.status} /></div>
      </div>
      <p className="plain">{report.description}</p>
      <p className="plain">Closed {formatTime(report.updatedAt)}</p>
      <Link className="touch-link" to={`/assignments/${encodeURIComponent(report.id)}`}>View {report.type} report</Link>
    </li>
  );
}

// Watches the report behind one draft. Access lost (reassigned, unreadable, or no longer this team's) drops the
// draft. A report that closed while the responder still has access keeps it, shown read-only.
function DraftWatch({ reportId, team }: { reportId: string; team: string }) {
  const { report, loading, error, notFound, removed } = useReport(reportId);
  useEffect(() => {
    if (loading || !getDraft(reportId)) return;
    if (error || notFound || removed || !report || report.assignedTeamId !== team) {
      clearDraft(reportId);
      return;
    }
    if (!isOpen(report)) {
      saveDraft(reportId, { closed: { type: report.type, reference: report.reference ?? '', status: report.status } });
    }
  }, [loading, error, notFound, removed, report, team, reportId]);
  return null;
}

type ReceiptCheck =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'saved'; status: string; peopleRescued: number }
  | { kind: 'not-found' }
  | { kind: 'error' };

// Read-only. Nothing here can be posted: the report is closed. The actions are the saved-update check (only for an
// unconfirmed attempt) and discarding the draft. The check is a server lookup under the original key; it never writes.
function ClosedDraft({ draft }: { draft: Draft }) {
  const c = draft.closed;
  const [check, setCheck] = useState<ReceiptCheck>({ kind: 'idle' });
  // The check button disappears once a result arrives. Focus moves to the result so it is not lost to the page body.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (check.kind === 'saved' || check.kind === 'not-found' || check.kind === 'error') resultRef.current?.focus();
  }, [check.kind]);
  if (!c) return null;
  const pending = draft.attempt;

  async function checkSaved() {
    if (!pending || check.kind === 'checking') return;
    setCheck({ kind: 'checking' });
    try {
      const res = (await api(`/reports/${draft.reportId}/updates/receipt`, {
        headers: { 'Idempotency-Key': pending.key },
      })) as { saved: boolean; status?: string; peopleRescued?: number };
      if (res.saved) {
        saveDraft(draft.reportId, { attempt: null });
        setCheck({ kind: 'saved', status: res.status ?? '', peopleRescued: res.peopleRescued ?? 0 });
      } else {
        setCheck({ kind: 'not-found' });
      }
    } catch {
      setCheck({ kind: 'error' });
    }
  }

  return (
    <li className="card assignment closed-assignment">
      <h3 className="queue__type">{c.type} report</h3>
      <p className="plain">This report is closed. This draft was not sent.</p>
      <dl>
        {c.reference && <div className="fact"><dt>Reference</dt><dd>{c.reference}</dd></div>}
        <div className="fact"><dt>Draft status</dt><dd>{draft.status || 'Not chosen'}</dd></div>
        <div className="fact"><dt>People rescued</dt><dd>{draft.peopleRescued || '0'}</dd></div>
        <div className="fact"><dt>Notes</dt><dd><span className="plain">{draft.note || 'None'}</span></dd></div>
      </dl>
      {pending && check.kind !== 'saved' && (
        <>
          <p className="plain">We couldn’t confirm whether this update was saved before the report closed.</p>
          <div className="actions__row">
            <button type="button" className="btn" aria-disabled={check.kind === 'checking'} aria-busy={check.kind === 'checking'} onClick={checkSaved}>
              {check.kind === 'checking' ? 'Checking…' : 'Check whether update was saved'}
            </button>
          </div>
        </>
      )}
      {(check.kind === 'saved' || check.kind === 'not-found' || check.kind === 'error') && (
        <div ref={resultRef} tabIndex={-1} className="receipt-result">
          {check.kind === 'saved' && (
            <Banner tone="info" role="status">This update was saved: {check.status}, {check.peopleRescued} rescued. It was not sent again.</Banner>
          )}
          {check.kind === 'not-found' && (
            <Banner tone="info" role="status">No record of this update was found, so submission wasn’t confirmed. Your draft is kept here, read-only. It was not sent.</Banner>
          )}
          {check.kind === 'error' && (
            <Banner tone="error" role="alert">We couldn’t check right now. Try again when you are online.</Banner>
          )}
        </div>
      )}
      <div className="actions__row">
        <Link className="touch-link" to={`/assignments/${encodeURIComponent(draft.reportId)}`}>View {c.type} report</Link>
        <button type="button" className="btn btn--ghost" onClick={() => clearDraft(draft.reportId)}>Discard draft</button>
      </div>
    </li>
  );
}

const RECENT_CLOSED_LIMIT = 10;

export default function AssignmentsPage() {
  const { team, user, role } = useAuth();
  const { reports, loading, error, fromCache, retry, windowSize, loadMore } = useAssignedReports(team);
  const closed = useClosedTeamReports(team);
  const drafts = useDrafts();
  const scope = user ? `${user.uid}|${role ?? ''}|${team ?? ''}` : '';
  const closedDrafts = [...drafts.values()].filter((d) => d.closed && hasContent(d));
  useEffect(() => { document.title = 'Assignments · Rescue Reports'; }, []);

  if (!team) {
    return (
      <EmptyState
        title="Your account is not linked to a rescue team"
        body="Ask your administrator to assign you to a team. Assignments appear here once you have one."
      />
    );
  }
  return (
    <div>
      {!error && <ConnectionNotice fromCache={fromCache} />}
      <TeamSummary team={team} />
      {!loading && !error && <ReportWindow count={reports.length} windowSize={windowSize} loadMore={loadMore} />}
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
          body="New assignments from your administrator appear here."
        />
      )}
      {reports.length > 0 && (
        <ul className="queue" aria-label="Assigned incidents, oldest first">
          {reports.map((r) => <AssignedCard key={r.id} report={r} scope={scope} />)}
        </ul>
      )}
      {[...drafts.keys()].map((id) => <DraftWatch key={id} reportId={id} team={team ?? ''} />)}
      {closedDrafts.length > 0 && (
        <section className="closed-assignments" aria-labelledby="closed-drafts-heading">
          <h2 id="closed-drafts-heading" className="queue__type">Unsent drafts for closed reports</h2>
          <p className="plain">These entries were not sent. The report closed before they could be posted, so they cannot be submitted. They stay in memory on this page only and are cleared when you sign out or lose access to the report.</p>
          <ul className="closed-list" aria-label="Unsent drafts for closed reports">
            {closedDrafts.map((d) => <ClosedDraft key={d.reportId} draft={d} />)}
          </ul>
        </section>
      )}
      {!closed.error && closed.reports.length > 0 && (
        <section className="closed-assignments" aria-labelledby="closed-assignments-heading">
          <h2 id="closed-assignments-heading" className="queue__type">Recently closed</h2>
          <ul className="closed-list" aria-label="Recently closed reports, most recent first">
            {closed.reports.slice(0, RECENT_CLOSED_LIMIT).map((r) => <ClosedRow key={r.id} report={r} />)}
          </ul>
          {closed.reports.length > RECENT_CLOSED_LIMIT && (
            <p className="plain">Showing the {RECENT_CLOSED_LIMIT} most recent closed reports.</p>
          )}
        </section>
      )}
    </div>
  );
}
