import { ConnectionNotice } from '../../components/ConnectionStatus';
import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDialogFocusReturn } from '../../components/useDialogFocusReturn';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { useReport, useReportUpdates, useReportsByIds, MAX_DUPLICATE_IDS, type ReportEntry } from './useReport';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import AssignTeamDialog from './AssignTeamDialog';
import { isOpen, formatTime, distanceMeters } from './format';
import { awaitingVerify, canAssign, canActOnReports, nextStep } from './workflow';
import { PRIORITIES, type Report, type Team } from '../../types/domain';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';
import ActivityHistory, { ActivityNote } from '../../components/calm/ActivityHistory';
import { resolvePhotoUrl } from '../../lib/photos';
import PhotoImage from '../../components/PhotoImage';
import EmptyState from '../../components/calm/EmptyState';

const CONFLICT = 'Someone else already changed this report. Reloading the latest status.';

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.status === 409) return CONFLICT;
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 404) return 'This report could not be found.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm the change. Reload this report to check its latest status.';
}

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

interface Candidate {
  id: string;
  entry: ReportEntry | undefined;
}

interface DuplicateBannerProps {
  report: Report;
  candidates: Candidate[];
  canAct: boolean;
  busy: boolean;
  onMark: (dupId: string) => void;
}

function DuplicateBanner({ report, candidates, canAct, busy, onMark }: DuplicateBannerProps) {
  return (
    <details className="card dup">
      <summary>Possible duplicates ({candidates.length})</summary>
      <section className="dup__body" aria-label="Possible duplicates">
      <h2 id="dup-title">Compare flagged reports</h2>
      <p>These reports were flagged as similar. Compare them with the one you are viewing.</p>
      <p>The report you are viewing will be closed as a duplicate of the report you choose.</p>
      <div className="dup__grid">
        <article className="dup__item">
          <h3>This report</h3>
          <dl>
            <Fact label="Type">{report.type}</Fact>
            <Fact label="Description"><span className="plain">{report.description}</span></Fact>
            <Fact label="Reported">{formatTime(report.createdAt)}</Fact>
            <Fact label="Status"><StatusBadge status={report.status} /></Fact>
          </dl>
        </article>
        {candidates.map(({ id, entry }) => {
          const r = entry && entry.report;
          if (!r) {
            return (
              <article key={id} className="dup__item">
                <h3>Flagged report</h3>
                {entry?.loading ? <Skeleton label="Loading flagged report"><SkeletonRows rows={3} height={32} /></Skeleton> : <p>Report unavailable</p>}
              </article>
            );
          }
          const dist = distanceMeters(report.location, r.location);
          return (
            <article key={id} className="dup__item">
              <h3>Flagged report</h3>
              <dl>
                <Fact label="Type">{r.type}</Fact>
                <Fact label="Description"><span className="plain">{r.description}</span></Fact>
                <Fact label="Reported">{formatTime(r.createdAt)}</Fact>
                {dist !== null && <Fact label="Distance">{dist} m away</Fact>}
                <Fact label="Status"><StatusBadge status={r.status} /></Fact>
              </dl>
              {canAct && isOpen(r) && (
                <button type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={() => onMark(r.id)}>
                  Mark the report you are viewing as a duplicate of this one
                </button>
              )}
            </article>
          );
        })}
      </div>
      </section>
    </details>
  );
}

export default function IncidentDetails() {
  const { id } = useParams();
  if (!id) return <p className="card">Report not found.</p>;
  return <IncidentView key={id} id={id} />;
}

interface IncidentViewProps {
  id: string;
}

// Looks up the assigned team's name for the facts list. Staff who cannot list teams still see the assignment.
function useAssignedTeamName(teamId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!teamId) {
      setName(null);
      return;
    }
    let active = true;
    api('/teams')
      .then((list) => {
        if (!active) return;
        const teams = Array.isArray(list) ? (list as Team[]) : [];
        setName(teams.find((t) => t.id === teamId)?.name ?? null);
      })
      .catch(() => {
        if (active) setName(null);
      });
    return () => {
      active = false;
    };
  }, [teamId]);
  return name;
}

function IncidentView({ id }: IncidentViewProps) {
  const { role, user } = useAuth();
  const { report, loading, error, notFound, removed, fromCache, retry } = useReport(id);
  const updatesState = useReportUpdates(id, `${user?.uid ?? ''}|${role ?? ''}`);
  const teamName = useAssignedTeamName(report?.assignedTeamId);
  const byId = useReportsByIds(report ? report.possibleDuplicates || [] : []);
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const rejectTrigger = useRef<HTMLButtonElement>(null);
  const assignTrigger = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const photoTrigger = useRef<HTMLButtonElement>(null);
  const photoContent = useRef<HTMLDivElement>(null);
  const rejectContent = useRef<HTMLDivElement>(null);
  useDialogFocusReturn(photoOpen, photoTrigger, photoContent);
  useDialogFocusReturn(rejecting, rejectTrigger, rejectContent);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('');
  const [classification, setClassification] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  const canAct = canActOnReports(role);
  const backTo = role === 'dmo' ? '/monitor' : '/dashboard';
  if (loading) return <Skeleton label="Loading incident details"><SkeletonRows rows={3} height={120} /></Skeleton>;
  if (error) {
    return (
      <div>
        <Banner tone="error" role="alert">We could not load this report. Check your connection and try again.</Banner>
        <button type="button" className="btn" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (removed || notFound || !report) return <EmptyState
    title={removed ? 'This report is no longer available.' : 'Report not found'}
    body={`The report may have been removed, or the link may be outdated. Return to ${canAct ? 'the incident queue' : 'the monitor'} to choose another report.`}
    action={<Link className="btn btn--ghost" to={backTo}>{canAct ? 'Back to the queue' : 'Back to monitor'}</Link>}
  />;

  const reportId = report.id;
  const step = nextStep(report);
  const candidates = (report.possibleDuplicates || []).slice(0, MAX_DUPLICATE_IDS).map((pid) => ({ id: pid, entry: byId[pid] }));
  const shownPriority = priority || report.priority || 'medium';

  async function run(path: string, body: unknown, okText: string): Promise<boolean> {
    // Busy buttons use aria-disabled so focus stays put; ignore repeat activations here.
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setPendingAction(path);
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${reportId}/${path}`, body === undefined ? { method: 'PATCH' } : { method: 'PATCH', body });
      setMessage({ kind: 'ok', text: okText });
      return true;
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
      return false;
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
      setBusy(false);
    }
  }

  async function confirmReject() {
    const ok = await run('reject', { reason: reason.trim() }, 'Report rejected.');
    setRejecting(false);
    if (ok) setReason('');
  }

  const loc = report.location;
  return (
    <div className="incident">
      <p className="incident__back"><Link className="touch-link" to={canAct ? '/dashboard' : '/monitor'}>{canAct ? 'Back to the queue' : 'Back to monitor'}</Link></p>

      <ConnectionNotice fromCache={fromCache} />
      <header className="incident__heading">
        <h2>{report.type} report</h2>
        <div className="incident__badges"><PriorityBadge priority={report.priority} /><StatusBadge status={report.status} /><VerifiedBadge verified={report.verified} /></div>
        <p className="incident__reference">Report {report.reference || report.id} · {formatTime(report.createdAt)}</p>
      </header>

      {message && (
        message.kind === 'ok'
          ? <Banner tone="info" role="status">{message.text}</Banner>
          : <Banner tone="error" role="alert">{message.text}</Banner>
      )}

      <div className="incident__content">
      <section className="card" aria-label="Report details">
        <h2>Reported incident</h2>
        <p className="plain incident__description">{report.description}</p>
        <dl>
          <Fact label="Classification"><span className="plain">{report.classification || 'Not classified'}</span></Fact>
          <Fact label="Address"><span className="plain">{report.addressText || 'No address given'}</span></Fact>
          {loc && Number.isFinite(loc.lat) && <Fact label="Location">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} ({loc.source})</Fact>}
          <Fact label="Contact"><span className="plain">{report.contact?.name || (!report.contact?.phone ? 'No contact provided' : '')}{' '}{report.contact?.phone && <a href={`tel:${report.contact.phone}`}>{report.contact.phone}</a>}</span></Fact>
          {report.assignedTeamId && <Fact label="Assigned team"><span className="plain">{teamName ?? 'Rescue team assigned'}</span></Fact>}
          {report.rejectionReason && <Fact label="Rejection reason"><span className="plain">{report.rejectionReason}</span></Fact>}
        </dl>
        {report.photos?.length > 0 && (
          <ul className="photos" aria-label="Photos">
            {report.photos.map((p, i) => (
              <li key={p.url}>
                <button type="button" className="photo-thumb" onClick={(event) => { photoTrigger.current = event.currentTarget; setPhotoIndex(i); setPhotoOpen(true); }}
                  aria-label={`Open photo ${i + 1} of ${report.photos.length}`}>
                  <PhotoImage src={resolvePhotoUrl(p.url)} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {photoIndex !== null && report.photos?.[photoIndex] && (
          <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
            <DialogContent ref={photoContent} className="photo-viewer">
              <DialogTitle>Photo {photoIndex + 1} of {report.photos.length}</DialogTitle>
              <img src={resolvePhotoUrl(report.photos[photoIndex].url)} alt={`Incident photo ${photoIndex + 1}`} />
              <div className="photo-viewer__nav">
                <button type="button" className="btn btn--ghost" disabled={photoIndex === 0}
                  onClick={() => setPhotoIndex(photoIndex - 1)}>Previous</button>
                <button type="button" className="btn btn--ghost" disabled={photoIndex === report.photos.length - 1}
                  onClick={() => setPhotoIndex(photoIndex + 1)}>Next</button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </section>

      <section className="card" aria-labelledby="updates-title">
        <h2 id="updates-title">Rescue updates</h2>
        {updatesState.error && (
          <Banner tone="error" role="alert">
            Could not load rescue updates.{' '}
            <button className="btn btn--ghost" type="button" onClick={updatesState.retry}>Try again</button>
          </Banner>
        )}
        {updatesState.loading && updatesState.updates.length === 0 && <Skeleton label="Loading rescue updates"><SkeletonRows rows={3} height={52} /></Skeleton>}
        {!updatesState.loading && !updatesState.error && updatesState.updates.length === 0 && <p>No rescue updates yet.</p>}
        {updatesState.updates.length > 0 && (
          <ActivityHistory
            updates={updatesState.updates}
            hasMore={updatesState.hasMore}
            onLoadOlder={updatesState.loadOlder}
            renderItem={(u) => (
              <>
                <strong>{u.status}</strong> <span>{formatTime(u.at)}</span>
                {u.peopleRescued > 0 && <p>People rescued: {u.peopleRescued}</p>}
                {u.note && <ActivityNote text={u.note} />}
              </>
            )}
          />
        )}
      </section>

      {candidates.length > 0 && (
        <DuplicateBanner report={report} candidates={candidates} canAct={canAct} busy={busy}
          onMark={(dupId) => run('duplicate', { duplicateOf: dupId }, 'Report marked as a duplicate.')} />
      )}
      </div>

      {canAct && (
        <aside className="card actions incident__actions" aria-label="Actions">
          <div className="next-step">
            <p className="next-step__label">Next step</p>
            <p className="next-step__title">{step.title}</p>
            <p className="next-step__body">{step.body}</p>
          </div>
          {canAssign(report) && (
            <div className="actions__row">
              <button ref={assignTrigger} type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={() => setAssigning(true)}>Assign team</button>
            </div>
          )}
          {report.status === 'Resolved' && (
            <div className="actions__row">
              <button type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={() => run('close', undefined, 'Report closed.')}>Close report</button>
            </div>
          )}
          {awaitingVerify(report) && (
            <div className="actions__row">
              <button type="button" className="btn" aria-disabled={busy} aria-busy={busy} onClick={() => run('verify', undefined, 'Report verified.')}>Verify</button>
              <button ref={rejectTrigger} type="button" className="btn btn--ghost" aria-disabled={busy} aria-busy={busy} onClick={() => setRejecting(true)}>Reject</button>
            </div>
          )}
          <button type="button" className="btn btn--ghost" aria-expanded={editingDetails} aria-controls="report-metadata"
            onClick={() => setEditingDetails((open) => !open)}>{editingDetails ? 'Hide report settings' : 'Edit priority & classification'}</button>
          {editingDetails && <div id="report-metadata" className="actions" role="group" aria-label="Report settings"><RequiredNote />
          {isOpen(report) && (
            <div className="actions__row">
              <label htmlFor="priority-select">Priority<RequiredMark /></label>
              <select id="priority-select" aria-required="true" disabled={busy} value={shownPriority} onChange={(e) => setPriority(e.target.value)}>
                {/* Values stay lowercase for the API; labels match the priority badge. */}
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <button type="button" className="btn" aria-disabled={busy} aria-busy={busy}
                onClick={() => run('priority', { priority: shownPriority }, 'Priority updated.')}>{pendingAction === 'priority' ? 'Saving priority…' : 'Set priority'}</button>
            </div>
          )}
          <div className="actions__row">
            <label htmlFor="classification-input">Classification<RequiredMark /></label>
            <input id="classification-input" aria-required="true" readOnly={busy} maxLength={100} value={classification}
              onChange={(e) => setClassification(e.target.value)} />
            <button type="button" className="btn" disabled={!classification.trim()} aria-disabled={busy} aria-busy={busy}
              onClick={() => run('classify', { classification: classification.trim() }, 'Classification saved.')}>{pendingAction === 'classify' ? 'Saving classification…' : 'Classify'}</button>
          </div>
          </div>}
        </aside>
      )}

      {canAct && (
        <AssignTeamDialog open={assigning} reportId={report.id} onClose={() => setAssigning(false)} returnFocusTo={assignTrigger}
          onAssigned={() => setMessage({ kind: 'ok', text: 'Rescue team assigned.' })} />
      )}

      {canAct && (
        <Dialog open={rejecting} onOpenChange={(open) => { if (!open) { rejectTrigger.current?.focus(); setRejecting(false); } }}>
          <DialogContent ref={rejectContent} showCloseButton={false} aria-describedby={undefined}
            onEscapeKeyDown={() => rejectTrigger.current?.focus()}
            onCloseAutoFocus={(e) => { e.preventDefault(); rejectTrigger.current?.focus(); }}
            onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogTitle>Reject this report</DialogTitle><RequiredNote />
            <label htmlFor="reject-reason">Reason<RequiredMark /></label>
            <textarea id="reject-reason" aria-required="true" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="actions__row">
              <button type="button" className="btn" disabled={!reason.trim()} aria-disabled={busy} aria-busy={busy} onClick={confirmReject}>Confirm reject</button>
              <button type="button" className="btn btn--ghost" onClick={() => { rejectTrigger.current?.focus(); setRejecting(false); }}>Cancel</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
