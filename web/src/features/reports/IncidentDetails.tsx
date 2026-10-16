import { useRef, useState, type ReactNode } from 'react';
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
import { PRIORITIES, type Report } from '../../types/domain';

const CONFLICT = 'Someone else already changed this report. Reloading the latest status.';

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.status === 409) return CONFLICT;
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 404) return 'This report could not be found.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
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
    <section className="card dup" aria-labelledby="dup-title">
      <h2 id="dup-title">Possible duplicates</h2>
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
                <p>{entry && entry.loading ? 'Loading...' : 'Report unavailable'}</p>
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
                <button type="button" className="btn" disabled={busy} onClick={() => onMark(r.id)}>
                  Mark the report you are viewing as a duplicate of this one
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
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

function IncidentView({ id }: IncidentViewProps) {
  const { role } = useAuth();
  const { report, loading, error, notFound, removed, retry } = useReport(id);
  const updatesState = useReportUpdates(id);
  const byId = useReportsByIds(report ? report.possibleDuplicates || [] : []);
  const [busy, setBusy] = useState(false);
  const rejectTrigger = useRef<HTMLButtonElement>(null);
  const assignTrigger = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('');
  const [classification, setClassification] = useState('');
  const [assigning, setAssigning] = useState(false);

  const backTo = role === 'dmo' ? '/monitor' : '/dashboard';
  if (loading) return <p role="status" className="loading">Loading...</p>;
  if (error) {
    return (
      <div>
        <p role="alert" className="error">We could not load this report. Check your connection and try again.</p>
        <button type="button" className="btn" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (removed) return <p className="card">This report is no longer available. <Link to={backTo}>Back to the queue</Link></p>;
  if (notFound || !report) return <p className="card">Report not found. <Link to={role === 'dmo' ? '/monitor' : '/dashboard'}>Back to the queue</Link></p>;

  const reportId = report.id;
  const canAct = role === 'dispatcher';
  const awaitingVerify = report.status === 'Submitted' || report.status === 'Under Verification';
  const candidates = (report.possibleDuplicates || []).slice(0, MAX_DUPLICATE_IDS).map((pid) => ({ id: pid, entry: byId[pid] }));
  const shownPriority = priority || report.priority || 'medium';
  const canAssign = report.status === 'Verified' || report.status === 'Awaiting Assignment';

  async function run(path: string, body: unknown, okText: string): Promise<boolean> {
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
      <p><Link to={canAct ? '/dashboard' : '/monitor'}>Back to the queue</Link></p>

      {message && (
        message.kind === 'ok'
          ? <p role="status" className="success">{message.text}</p>
          : <p role="alert" className="error">{message.text}</p>
      )}

      {candidates.length > 0 && (
        <DuplicateBanner report={report} candidates={candidates} canAct={canAct} busy={busy}
          onMark={(dupId) => run('duplicate', { duplicateOf: dupId }, 'Report marked as a duplicate.')} />
      )}

      <section className="card" aria-label="Report details">
        <div className="incident__badges">
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
          <VerifiedBadge verified={report.verified} />
        </div>
        <dl>
          <Fact label="Type">{report.type}</Fact>
          <Fact label="Description"><span className="plain">{report.description}</span></Fact>
          <Fact label="Classification"><span className="plain">{report.classification || 'Not classified'}</span></Fact>
          <Fact label="Reported">{formatTime(report.createdAt)}</Fact>
          <Fact label="Address"><span className="plain">{report.addressText || 'No address given'}</span></Fact>
          {loc && Number.isFinite(loc.lat) && <Fact label="Location">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} ({loc.source})</Fact>}
          <Fact label="Contact"><span className="plain">{report.contact?.name} {report.contact?.phone}</span></Fact>
          {report.rejectionReason && <Fact label="Rejection reason"><span className="plain">{report.rejectionReason}</span></Fact>}
        </dl>
        {report.photos?.length > 0 && (
          <ul className="photos" aria-label="Photos">
            {report.photos.map((p, i) => (
              <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer">Photo {i + 1}</a></li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="updates-title">
        <h2 id="updates-title">Rescue updates</h2>
        {updatesState.error && <p role="alert" className="error">Could not load rescue updates.</p>}
        {!updatesState.error && updatesState.updates.length === 0 && <p>No rescue updates yet.</p>}
        {updatesState.updates.length > 0 && (
          <ol className="updates">
            {updatesState.updates.map((u) => (
              <li key={u.id}>
                <strong>{u.status}</strong> <span>{formatTime(u.at)}</span>
                {u.peopleRescued > 0 && <p>People rescued: {u.peopleRescued}</p>}
                {u.note && <p className="plain">{u.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {canAct && (
        <section className="card actions" aria-label="Actions">
          {canAssign && (
            <div className="actions__row">
              <button ref={assignTrigger} type="button" className="btn" disabled={busy} onClick={() => setAssigning(true)}>Assign team</button>
            </div>
          )}
          {awaitingVerify && (
            <div className="actions__row">
              <button type="button" className="btn" disabled={busy} onClick={() => run('verify', undefined, 'Report verified.')}>Verify</button>
              <button ref={rejectTrigger} type="button" className="btn btn--ghost" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
            </div>
          )}
          {isOpen(report) && (
            <div className="actions__row">
              <label htmlFor="priority-select">Priority</label>
              <select id="priority-select" value={shownPriority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="button" className="btn" disabled={busy}
                onClick={() => run('priority', { priority: shownPriority }, 'Priority updated.')}>Set priority</button>
            </div>
          )}
          <div className="actions__row">
            <label htmlFor="classification-input">Classification</label>
            <input id="classification-input" maxLength={100} value={classification}
              onChange={(e) => setClassification(e.target.value)} />
            <button type="button" className="btn" disabled={busy || !classification.trim()}
              onClick={() => run('classify', { classification: classification.trim() }, 'Classification saved.')}>Classify</button>
          </div>
        </section>
      )}

      {canAct && assigning && (
        <AssignTeamDialog reportId={report.id} onClose={() => setAssigning(false)} returnFocusTo={assignTrigger}
          onAssigned={() => setMessage({ kind: 'ok', text: 'Rescue team assigned.' })} />
      )}

      {canAct && rejecting && (
        <Dialog open onOpenChange={(open) => { if (!open) setRejecting(false); }}>
          <DialogContent showCloseButton={false} aria-describedby={undefined}
            onCloseAutoFocus={(e) => { e.preventDefault(); rejectTrigger.current?.focus(); }}
            onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogTitle>Reject this report</DialogTitle>
            <label htmlFor="reject-reason">Reason (required)</label>
            <textarea id="reject-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="actions__row">
              <button type="button" className="btn" disabled={busy || !reason.trim()} onClick={confirmReject}>Confirm reject</button>
              <button type="button" className="btn btn--ghost" onClick={() => setRejecting(false)}>Cancel</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
