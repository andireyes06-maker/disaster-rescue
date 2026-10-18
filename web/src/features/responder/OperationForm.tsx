import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useRef, useState } from 'react';
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

// Whole-number text becomes its integer value. Anything else becomes NaN, which the schema rejects.
// React Hook Form also passes the numeric default through here, so numbers are returned unchanged.
export function parsePeopleRescued(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const text = raw.trim();
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.status === 409) return 'This report can no longer be updated. Reload the page to see its latest status.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm your response update. Check the report history before sending it again.';
}

interface OperationFormProps {
  reportId: string;
  // Current report status. Only the statuses the API accepts from here are offered.
  reportStatus?: string;
  onSaved?: () => void;
}

// Mirrors the API workflow: Team Assigned -> Rescue in Progress -> Resolved.
export function allowedOperationStatuses(reportStatus?: string): readonly (typeof OPERATION_STATUSES)[number][] {
  if (reportStatus === undefined) return OPERATION_STATUSES;
  if (reportStatus === 'Team Assigned') return ['Rescue in Progress'];
  if (reportStatus === 'Rescue in Progress') return ['Rescue in Progress', 'Resolved'];
  return [];
}

export default function OperationForm({ reportId, reportStatus, onSaved }: OperationFormProps) {
  const statuses = allowedOperationStatuses(reportStatus);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OperationUpdate>({
    resolver: zodResolver(operationUpdateSchema),
    defaultValues: { status: statuses[0] ?? OPERATION_STATUSES[0], peopleRescued: 0, note: '' },
  });

  async function onValid(values: OperationUpdate) {
    if (pending.current) return;
    pending.current = true;
    setApiError(null);
    setBusy(true);
    try {
      await api(`/reports/${reportId}/updates`, {
        method: 'POST',
        body: { status: values.status, peopleRescued: values.peopleRescued, note: values.note },
      });
      setSaved(true);
      reset({ ...values, note: '' });
      if (onSaved) onSaved();
    } catch (err) {
      setApiError(errorText(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const message = apiError;

  return (
    <MotionForm className="ops-form" noValidate aria-label="Rescue operation update"
      onChange={() => setSaved(false)}
      onSubmit={(e) => { setSaved(false); return handleSubmit(onValid)(e); }}>
      <RequiredNote /><label htmlFor={`status-${reportId}`}>Status<RequiredMark /></label>
      <select aria-required="true" id={`status-${reportId}`} {...register('status')}>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <label htmlFor={`count-${reportId}`}>People rescued<RequiredMark /></label>
      <input aria-required="true" id={`count-${reportId}`} type="text" inputMode="numeric"
        aria-invalid={!!errors.peopleRescued} aria-describedby={[`count-help-${reportId}`, errors.peopleRescued ? `count-error-${reportId}` : null].filter(Boolean).join(' ')}
        {...register('peopleRescued', { setValueAs: parsePeopleRescued })} />
      <span id={`count-help-${reportId}`} className="ops-form__help">Whole number, 0 to 10000.</span>

      {errors.peopleRescued && <FieldError role="alert" id={`count-error-${reportId}`}>{errors.peopleRescued.message}</FieldError>}
      <label htmlFor={`note-${reportId}`}>Notes (optional)</label>
      <textarea id={`note-${reportId}`} aria-invalid={!!errors.note} aria-describedby={errors.note ? `note-error-${reportId}` : undefined} rows={3} maxLength={MAX_NOTE_LENGTH} {...register('note')} />

      {errors.note && <FieldError role="alert" id={`note-error-${reportId}`}>{errors.note.message}</FieldError>}
      {message && <Banner tone="error" role="alert">{message}</Banner>}
      {saved && <Banner tone="info" role="status">Update saved.</Banner>}

      <div className="actions__row">
        <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}>{busy ? 'Posting update…' : 'Submit update'}</button>
      </div>
    </MotionForm>
  );
}
