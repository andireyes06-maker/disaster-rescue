import { teamsOf } from '../../types/domain';
import ReportWindow from '../../components/ReportWindow';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import { useEffect, useRef, useState, type Ref } from 'react';
import { flushSync } from 'react-dom';
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
import TeamIdentity from './TeamIdentity';
import AssignmentRows from './AssignmentRows';
import { useSearchParams } from 'react-router-dom';
import PlaceLabel from '../../components/PlaceLabel';
import { AssignmentMap } from './AssignmentMap';
import PhotoImage from '../../components/PhotoImage';
import { currentPosition, isLocationUnavailable, LOCATION_NOT_SENT_MESSAGE } from '../../lib/position';
import { useResponderAction } from './useResponderAction';
import AssignedProgress from './AssignedProgress';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { formatTime, isOpen } from '../reports/format';
import { clearDraft, getDraft, hasContent, saveDraft, settleAttempt, unresolvedAttempts, useDrafts, type Draft } from './draftStore';
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
  headingRef?: Ref<HTMLHeadingElement>;
}

export function AssignedCard({ report, scope, headingRef }: AssignedCardProps) {
  const beginAction = useResponderAction(report.id, scope);
  const progressPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { const panel = progressPanel.current; const reveal = () => flushSync(() => setPane('progress')); panel?.addEventListener('reveal-progress', reveal); return () => panel?.removeEventListener('reveal-progress', reveal); }, []);
  const [pane, setPane] = useState<'brief' | 'progress'>('brief');
  const [openForm, setOpenForm] = useState(false);
  const canAcknowledge = report.status === 'Team Assigned' || report.status === 'Rescue in Progress';
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
    const action = beginAction();
    acknowledging.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const position = await currentPosition();
      if (!action.isCurrent()) return;
      await api(`/reports/${report.id}/acknowledge`, { method: 'POST', body: { position }, getToken: action.getToken });
      if (!action.isCurrent()) return;
      setAccepted(true);
      setMessage({ kind: 'ok', text: 'Assignment acknowledged.' });
    } catch (err) {
      if (!action.isCurrent()) return;
      setMessage({ kind: 'error', text: isLocationUnavailable(err) ? LOCATION_NOT_SENT_MESSAGE : errorText(err) });
    } finally {
      if (action.isCurrent()) { acknowledging.current = false; setBusy(false); }
    }
  }

  return (
    <article className="card assignment response-brief">
      <div className="assignment__main">
        <div className="assignment__heading">
        <div>{report.reference && <span className="response-reference">{report.reference}</span>}<h2 ref={headingRef} tabIndex={-1} className="queue__type">{report.type} report</h2></div>
        <div className="incident__badges"><PriorityBadge priority={report.priority} /><StatusBadge status={report.status} /></div>
        </div>
        <div className="response-detail-nav" role="group" aria-label="Assignment sections"><button type="button" aria-controls={`brief-${report.id}`} aria-pressed={pane === 'brief'} onClick={() => setPane('brief')}>Report brief</button><button type="button" aria-controls={`progress-${report.id}`} aria-pressed={pane === 'progress'} onClick={() => setPane('progress')}>Progress history</button></div>
        <div className="response-action-panel">
        {message && (
          message.kind === 'ok'
            ? <Banner tone="info" role="status">{message.text}</Banner>
            : <Banner tone="error" role="alert">{message.text}</Banner>
        )}
        <div className="actions__row">
          {accepted || acknowledgement.acknowledged
            ? <p className="plain assignment__acknowledged"><Check size={16} aria-hidden="true" /> Acknowledged {acknowledgement.at ? formatTime(acknowledgement.at) : ''}</p>
            : !canAcknowledge ? <p>This report is resolved. No further field updates are available.</p>
            : acknowledgement.loading ? <p role="status">Checking acknowledgement…</p>
            : acknowledgement.error ? <Banner tone="error" role="alert">Could not check acknowledgement. Reload before acknowledging this assignment. <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>Reload assignments</button></Banner>
            : <button type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={acknowledge}>{busy ? 'Acknowledging…' : 'Acknowledge'}</button>}
          {(canPostUpdate || openForm) && (
            <button type="button" className={accepted || acknowledgement.acknowledged ? 'btn' : 'btn btn--ghost'} aria-controls={`operation-${report.id}`} aria-expanded={openForm}
              onClick={() => setOpenForm((v) => !v)}>
              {openForm ? 'Hide operation form' : 'Post an update'}
            </button>
          )}
        </div>
        <div id={`operation-${report.id}`} hidden={!openForm}>{openForm && <OperationForm reportId={report.id} reportStatus={report.status} closed={!canPostUpdate} />}</div>
        </div>
        <div id={`brief-${report.id}`} hidden={pane !== 'brief'} className="response-detail-facts">
        <div className="response-incident-context"><h3>Situation</h3><p className="plain">{report.description}</p>
        <dl>
          <div className="fact"><dt>Address</dt><dd><span className="plain">{report.addressText || 'No address given'}</span></dd></div>
          <div className="fact"><dt>Location</dt><dd>
            {hasLoc ? (
              <>
                <PlaceLabel point={loc} saved={report.placeName || report.area} />{' '}
                <a className="touch-link" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">Open in maps</a>
              </>
            ) : 'Not available'}
          </dd></div>
          <div className="fact"><dt>Reported</dt><dd>{formatTime(report.createdAt)}</dd></div>
        </dl>
        <dl><div className="fact"><dt>Contact person</dt><dd>{report.contact?.name || report.reporterName || 'Not provided'}</dd></div><div className="fact"><dt>Contact number</dt><dd>{report.contact?.phone || report.reporterPhone ? <a href={`tel:${report.contact?.phone || report.reporterPhone}`}>{report.contact?.phone || report.reporterPhone}</a> : 'Not provided'}</dd></div></dl></div>
        <div className="response-incident-location"><h3>Incident location</h3><AssignmentMap reports={[report]} /></div>
        {!!report.photos?.length && <details className="response-evidence"><summary>Resident photos ({report.photos.length})</summary><div>{report.photos.map((photo, index) => <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open report photo ${index + 1}`}><PhotoImage src={photo.url} /></a>)}</div></details>}
        </div>
        <div id={`progress-${report.id}`} data-progress-panel ref={progressPanel} hidden={pane !== 'progress'}><AssignedProgress reportId={report.id} scope={scope} /></div>
      </div>
    </article>
  );
}

// Watches the report behind one draft. Access lost (reassigned, unreadable, or no longer this team's) drops the
// draft. A report that closed while the responder still has access keeps it, shown read-only.
export function DraftWatch({ reportId, team }: { reportId: string; team: string }) {
  const { report, loading, error, notFound, removed } = useReport(reportId);
  useEffect(() => {
    if (loading || !getDraft(reportId)) return;
    if (error || notFound || removed || !report || !team || !teamsOf(report).includes(team)) {
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
export function ClosedDraft({ draft }: { draft: Draft }) {
  const beginAction = useResponderAction(draft.reportId);
  const checking = useRef(false);
  const c = draft.closed;
  const [check, setCheck] = useState<ReceiptCheck>({ kind: 'idle' });
  const [selectedKey, setSelectedKey] = useState('');
  // Focus moves to each receipt result. Other unresolved receipts remain available to check.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (check.kind === 'saved' || check.kind === 'not-found' || check.kind === 'error') resultRef.current?.focus();
  }, [check.kind]);
  if (!c) return null;
  const attempts = unresolvedAttempts(draft);
  const pending = attempts.find(attempt => attempt.key === selectedKey) ?? draft.attempt;

  async function checkSaved() {
    if (!pending || checking.current) return;
    const action = beginAction();
    checking.current = true;
    setCheck({ kind: 'checking' });
    try {
      const res = (await api(`/reports/${draft.reportId}/updates/receipt`, {
        headers: { 'Idempotency-Key': pending.key },
        getToken: action.getToken,
      })) as { saved: boolean; status?: string; peopleRescued?: number };
      if (!action.isCurrent()) return;
      if (res.saved) {
        settleAttempt(draft.reportId, pending.key);
        setCheck({ kind: 'saved', status: res.status ?? '', peopleRescued: res.peopleRescued ?? 0 });
      } else {
        setCheck({ kind: 'not-found' });
      }
    } catch {
      if (action.isCurrent()) setCheck({ kind: 'error' });
    } finally {
      if (action.isCurrent()) checking.current = false;
    }
  }

  return (
    <li className="card assignment closed-assignment">
      <h3 className="queue__type">{c.type} report</h3>
      <p className="plain">{draft.attempt ? 'This report is closed. Your earlier update has an unconfirmed receipt.' : check.kind === 'saved' ? 'This report is closed. Your earlier update was saved.' : 'This report is closed. This draft was not sent.'}</p>
      <dl>
        {c.reference && <div className="fact"><dt>Reference</dt><dd>{c.reference}</dd></div>}
        <div className="fact"><dt>Draft status</dt><dd>{draft.status || 'Not chosen'}</dd></div>
        <div className="fact"><dt>People rescued</dt><dd>{draft.peopleRescued || '0'}</dd></div>
        <div className="fact"><dt>Notes</dt><dd><span className="plain">{draft.note || 'None'}</span></dd></div>
      </dl>
      {pending && (
        <>
          <p className="plain">We couldn’t confirm whether this update was saved before the report closed.</p>
          {attempts.length > 1 && <label>Unconfirmed update
            <select disabled={check.kind === 'checking'} value={pending.key} onChange={event => { setSelectedKey(event.target.value); setCheck({ kind: 'idle' }); }}>
              {attempts.map((attempt, index) => <option key={attempt.key} value={attempt.key}>Update {index + 1}: {attempt.status}</option>)}
            </select>
          </label>}
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
            <Banner tone="info" role="status">No record of this update was found, so submission wasn’t confirmed. Your draft is kept here, read-only. Nothing was sent by this check.</Banner>
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

export function DraftShelf() {
  const { team } = useAuth();
  const drafts = useDrafts();
  const closedDrafts = [...drafts.values()].filter(d => d.closed && hasContent(d));
  return <>
    {[...drafts.keys()].map(id => <DraftWatch key={id} reportId={id} team={team ?? ''} />)}
    {closedDrafts.length > 0 && <section className="closed-assignments" aria-labelledby="closed-drafts-heading">
      <h2 id="closed-drafts-heading">Drafts and unconfirmed updates</h2>
      <p>Closed reports cannot receive new updates. Unconfirmed earlier attempts can be checked below. Drafts stay in memory only, while your access continues.</p>
      <ul className="closed-list">{closedDrafts.map(d => <ClosedDraft key={d.reportId} draft={d} />)}</ul>
    </section>}
  </>;
}

export default function AssignmentsPage() {
  const { team } = useAuth();
  const open = useAssignedReports(team);
  const closed = useClosedTeamReports(team);
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') === 'closed' ? 'closed' : 'active';
  const search = params.get('q') || '';
  const status = params.get('status') || '';
  const state = tab === 'closed' ? closed : open;
  const filtered = (tab === 'closed' ? state.reports.slice(0, 10) : state.reports).filter(r => (!status || r.status === status) && `${r.reference || ''} ${r.type} ${r.description} ${r.placeName || ''} ${r.area || ''} ${r.addressText || ''}`.toLowerCase().includes(search.toLowerCase()));
  const setFilter = (name: string, value: string) => setParams(current => { const next = new URLSearchParams(current); if (value) next.set(name, value); else next.delete(name); return next; }, { replace: true });
  useEffect(() => { document.title = 'Assignments · I-Report'; }, []);
  if (!team) return <EmptyState title="Your account is not linked to a rescue team" body="Your administrator needs to link your account before team assignments and locations can be shown." />;
  return <div className="response-workspace">
    <TeamIdentity id={team} />
    <div className="response-list-panel">
      <div className="response-list-nav" role="group" aria-label="Assignment views">
        <button className={tab === 'active' ? 'is-selected' : ''} type="button" aria-pressed={tab === 'active'} onClick={() => setParams({ view: 'active' })}>Active assignments</button>
        <button className={tab === 'closed' ? 'is-selected' : ''} type="button" aria-pressed={tab === 'closed'} onClick={() => setParams({ view: 'closed' })}>Recently closed</button>
      </div>
      <div className="response-filters">
        <div><label htmlFor="assignment-search">Find an assignment</label><input id="assignment-search" type="search" placeholder="Reference, incident or location" value={search} onChange={e => setFilter('q', e.target.value)} /></div>
        <div><label htmlFor="assignment-status">Status</label><select id="assignment-status" value={status} onChange={e => setFilter('status', e.target.value)}><option value="">All statuses</option>{(tab === 'active' ? ['Team Assigned', 'Rescue in Progress', 'Resolved'] : ['Closed', 'Rejected', 'Duplicate', 'Cancelled']).map(s => <option key={s}>{s}</option>)}</select></div>
      </div>
      <p aria-live="polite" aria-atomic="true" className="visually-hidden">{state.loading ? 'Loading assignments' : state.error ? 'Assignment count unavailable' : `${filtered.length} loaded assignment${filtered.length === 1 ? ' matches' : 's match'}${state.partialError ? '; list may be incomplete' : ''}`}</p>
      <section aria-label={tab === 'closed' ? 'Recently closed' : 'Active assignments'}>
        <div className="response-section-head"><h2>{tab === 'closed' ? 'Recently closed' : 'Active assignments'}</h2><span>{tab === 'closed' ? 'Up to 10 most recently updated reports' : 'Oldest reported first'}</span></div>
        <ConnectionNotice fromCache={state.fromCache} />
        {(state.error || state.partialError) && <Banner tone="error" role="alert">{state.partialError ? 'Some assignments could not load. This list may be incomplete.' : 'Could not load your assignments.'} <button type="button" className="btn btn--ghost" onClick={state.retry}>Try again</button></Banner>}
        {state.loading && <Skeleton label="Loading assignments"><SkeletonRows rows={3} height={90} /></Skeleton>}
        {!state.loading && !state.error && !state.partialError && !filtered.length && <EmptyState title={search || status ? 'No assignments match these filters' : tab === 'closed' ? 'No recently closed assignments' : 'No open assignments right now'} body={search || status ? 'Change your search or status to see more assignments.' : tab === 'closed' ? 'Completed work appears here after a report is closed.' : 'New assignments from your administrator appear here.'} action={search || status ? <button className="btn btn--ghost" type="button" onClick={() => setParams({ view: tab })}>Clear filters</button> : undefined} />}
        {!!filtered.length && <AssignmentRows reports={filtered} closed={tab === 'closed'} />}
        {tab === 'active' && !open.loading && <ReportWindow order="oldest" count={open.reports.length} windowSize={open.windowSize} loadMore={open.loadMore} />}
        {(search || status) && <p className="response-scope">Filters apply to the loaded assignments. Load more to search a larger window.</p>}
      </section>
    </div>
    <DraftShelf />
  </div>;
}
