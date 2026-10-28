import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import {
  OPERATION_STATUSES,
  MAX_NOTE_LENGTH,
  operationUpdateSchema,
  type OperationUpdate,
} from '../../lib/schemas';
import Banner from '../../components/calm/Banner';
import { focusProgressHistory, progressSectionId } from './AssignedProgress';
import { saveDraft, useDraft, reserveAttempt, settleAttempt, forgetAttempts, type DraftAttempt } from './draftStore';
import { useResponderAction } from './useResponderAction';
import { currentPosition, isLocationUnavailable, LOCATION_NOT_SENT_MESSAGE } from '../../lib/position';

// Whole-number text becomes its integer value. Anything else becomes NaN, which the schema rejects.
// React Hook Form also passes the numeric default through here, so numbers are returned unchanged.
export function parsePeopleRescued(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const text = raw.trim();
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

// A lost reply, timeout, server error or rate limit: the server may already have saved the update.
// The entries stay in the form and the retry reuses the same Idempotency-Key, so a retry cannot record it twice.
function isUncertain(err: unknown): boolean {
  const failure = apiFailure(err);
  return !!failure && (failure.status === 0 || failure.status === 429 || failure.status >= 500);
}

// The phrase "check the report history" links to this assignment's progress history. The fragment moves
// without a page load or a route change (focusProgressHistory updates it with replaceState).
function unconfirmedCopy(reportId: string): ReactNode {
  return (
    <>
      We couldn’t confirm whether your update was saved. Your entries are still here. Retry without changing them, or{' '}
      <a href={`#${progressSectionId(reportId)}`} onClick={(e) => { e.preventDefault(); focusProgressHistory(reportId); }}>check the report history</a>.
    </>
  );
}

function errorText(err: unknown, reportId: string): ReactNode {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.status === 404) return 'This report is no longer assigned to your team.';
    if (failure.status === 409) return 'This report can no longer be updated. Reload the page to see its latest status.';
    if (failure.status === 403) return 'You do not have permission to do that.';
  }
  if (isUncertain(err)) return unconfirmedCopy(reportId);
  return 'Could not confirm your response update. Check the report history before sending it again.';
}

interface OperationFormProps {
  reportId: string;
  // Current report status. Only the statuses the API accepts from here are offered.
  reportStatus?: string;
  // True once the report no longer accepts updates. Entries stay visible and read-only. Only a pending
  // unconfirmed attempt can still be submitted, so its retry can replay the first result.
  closed?: boolean;
  onSaved?: () => void;
}

// Mirrors the API workflow: Team Assigned -> Rescue in Progress -> Resolved.
export function allowedOperationStatuses(reportStatus?: string): readonly (typeof OPERATION_STATUSES)[number][] {
  if (reportStatus === undefined) return OPERATION_STATUSES;
  if (reportStatus === 'Team Assigned') return ['Rescue in Progress'];
  if (reportStatus === 'Rescue in Progress') return ['Rescue in Progress', 'Resolved'];
  return [];
}

export default function OperationForm({ reportId, reportStatus, closed = false, onSaved }: OperationFormProps) {
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<ReactNode>(null);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const submissions = useRef(0);
  const beginAction = useResponderAction(reportId);
  const [attemptLimit, setAttemptLimit] = useState(false);
  // Drafts and uncertain attempts live in the in-memory draft store, so they survive the card unmounting
  // (for example when the report closes) and are dropped when the signed-in identity changes.
  const draft = useDraft(reportId);
  const attempt: DraftAttempt | null = draft?.attempt ?? null;
  const unconfirmedStatus = attempt?.status ?? null;
  const retryOnly = closed && unconfirmedStatus === null;
  // A closed report shows its own status, so the Status box is never blank. A pending retry keeps the status it was sent with.
  const statuses: readonly string[] = closed
    ? [unconfirmedStatus ?? reportStatus].filter((s): s is string => !!s)
    : allowedOperationStatuses(reportStatus);
  const defaults: OperationUpdate = {
    status: (closed && reportStatus ? reportStatus : allowedOperationStatuses(reportStatus)[0] ?? OPERATION_STATUSES[0]) as OperationUpdate['status'],
    peopleRescued: 0,
    note: '',
  };
  const { register, handleSubmit, reset, getValues, setValue, watch, formState: { errors } } = useForm<OperationUpdate>({
    resolver: zodResolver(operationUpdateSchema),
    defaultValues: draft
      ? { status: (draft.status || defaults.status) as OperationUpdate['status'], peopleRescued: parsePeopleRescued(draft.peopleRescued) || 0, note: draft.note }
      : defaults,
  });

  // Every edit is mirrored to the draft store (memory only). Nothing is submitted from here.
  useEffect(() => {
    const subscription = watch((values) => {
      saveDraft(reportId, {
        status: String(values.status ?? ''),
        peopleRescued: String(values.peopleRescued ?? ''),
        note: values.note ?? '',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, reportId]);

  // If the draft is dropped while the form is open (identity change), the fields go back to empty.
  const hadDraft = useRef(!!draft);
  useEffect(() => {
    if (draft) hadDraft.current = true;
    else if (hadDraft.current) { hadDraft.current = false; pending.current = false; setBusy(false); setApiError(null); setSaved(false); setAttemptLimit(false); reset(defaults); }
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // A report that closed with nothing pending shows its own status, so the Status box matches what is displayed.
  useEffect(() => {
    if (closed && !unconfirmedStatus && reportStatus) setValue('status', reportStatus as OperationUpdate['status']);
  }, [closed, unconfirmedStatus, reportStatus, setValue]);

  async function onValid(values: OperationUpdate) {
    if (pending.current || retryOnly) return;
    const action = beginAction();
    const submission = ++submissions.current;
    pending.current = true;
    setApiError(null);
    setBusy(true);
    let sent: DraftAttempt | null = null;
    try {
      // The API checks the responder is within the incident's reach, so the browser's position is sent with the update.
      const position = await currentPosition();
      if (!action.isCurrent()) return;
      const fingerprint = JSON.stringify([values.status, String(values.peopleRescued), values.note]);
      sent = reserveAttempt(reportId, fingerprint, values.status);
      if (!sent) { setAttemptLimit(true); return; }
      setAttemptLimit(false);
      await api(`/reports/${reportId}/updates`, {
        method: 'POST',
        getToken: action.getToken,
        headers: { 'Idempotency-Key': sent.key },
        body: { status: values.status, peopleRescued: values.peopleRescued, note: values.note, position },
      });
      if (!action.isCurrent()) return;
      settleAttempt(reportId, sent.key);
      setSaved(true);
      // Clear only what was submitted. A field edited while the post was pending keeps its newer value.
      const current = getValues();
      const unchanged = (key: keyof OperationUpdate) => String(current[key]) === String(values[key]);
      reset({
        status: unchanged('status') ? values.status : current.status,
        peopleRescued: unchanged('peopleRescued') ? values.peopleRescued : current.peopleRescued,
        note: unchanged('note') ? '' : current.note,
      });
      if (onSaved) onSaved();
    } catch (err) {
      if (!action.isCurrent()) return;
      setApiError(isLocationUnavailable(err) ? LOCATION_NOT_SENT_MESSAGE : errorText(err, reportId));
      // Only an uncertain outcome keeps a retry pending. A refusal means the update was not saved.
      if (sent && !isUncertain(err)) settleAttempt(reportId, sent.key);
    } finally {
      // A stale action's result is dropped, but it still gives the form back unless a newer submit has taken over.
      // A same-uid sign-in leaves the draft in place, so nothing else would clear the busy state.
      if (action.isCurrent() || submissions.current === submission) { pending.current = false; setBusy(false); }
    }
  }

  return (
    <MotionForm className="ops-form" noValidate aria-label="Rescue operation update"
      onChange={() => setSaved(false)}
      onSubmit={(e) => { setSaved(false); return handleSubmit(onValid)(e); }}>
      {closed && (
        <Banner tone="info" role="status">
          This report is now {reportStatus ?? 'closed'}, so new updates are closed.
          {unconfirmedStatus ? ' Retry to confirm the update you sent. It will not be recorded twice.' : ' Your entries are kept here but cannot be posted.'}
        </Banner>
      )}
      <RequiredNote /><label htmlFor={`status-${reportId}`}>Status<RequiredMark /></label>
      <select aria-required="true" id={`status-${reportId}`} disabled={retryOnly} {...register('status')}>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <label htmlFor={`count-${reportId}`}>People rescued<RequiredMark /></label>
      <input aria-required="true" id={`count-${reportId}`} type="text" inputMode="numeric" readOnly={closed}
        aria-invalid={!!errors.peopleRescued} aria-describedby={[`count-help-${reportId}`, errors.peopleRescued ? `count-error-${reportId}` : null].filter(Boolean).join(' ')}
        {...register('peopleRescued', { setValueAs: parsePeopleRescued })} />
      <span id={`count-help-${reportId}`} className="ops-form__help">Whole number, 0 to 10000.</span>

      {errors.peopleRescued && <FieldError role="alert" id={`count-error-${reportId}`}>{errors.peopleRescued.message}</FieldError>}
      <label htmlFor={`note-${reportId}`}>Notes (optional)</label>
      <textarea id={`note-${reportId}`} readOnly={closed} aria-invalid={!!errors.note} aria-describedby={errors.note ? `note-error-${reportId}` : undefined} rows={3} maxLength={MAX_NOTE_LENGTH} {...register('note')} />

      {errors.note && <FieldError role="alert" id={`note-error-${reportId}`}>{errors.note.message}</FieldError>}
      {attemptLimit && <Banner tone="error" role="alert">
        Five updates have unconfirmed receipts. Retry an unchanged update or check the report history before sending another.
        <button type="button" className="btn btn--ghost" onClick={() => {
          if (window.confirm('Forget all unconfirmed update receipts? An earlier update may already be saved. Check the history before sending it again.')) {
            forgetAttempts(reportId); setAttemptLimit(false);
          }
        }}>Forget unconfirmed updates</button>
      </Banner>}
      {apiError && <Banner tone="error" role="alert">{apiError}</Banner>}
      {saved && <Banner tone="info" role="status">Update saved.</Banner>}

      <div className="actions__row">
        <button type="submit" className="btn" aria-disabled={busy || retryOnly} aria-busy={busy}>{busy ? 'Posting update…' : 'Submit update'}</button>
      </div>
    </MotionForm>
  );
}
