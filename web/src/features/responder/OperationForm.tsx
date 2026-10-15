import { useState } from 'react';
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
  return 'Something went wrong. Please try again.';
}

interface OperationFormProps {
  reportId: string;
  onSaved?: () => void;
}

export default function OperationForm({ reportId, onSaved }: OperationFormProps) {
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OperationUpdate>({
    resolver: zodResolver(operationUpdateSchema),
    defaultValues: { status: OPERATION_STATUSES[0], peopleRescued: 0, note: '' },
  });

  async function onValid(values: OperationUpdate) {
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
      setBusy(false);
    }
  }

  const message = errors.peopleRescued?.message ?? errors.note?.message ?? apiError;

  return (
    <form className="ops-form" noValidate aria-label="Rescue operation update"
      onSubmit={(e) => { setSaved(false); return handleSubmit(onValid)(e); }}>
      <label htmlFor={`status-${reportId}`}>Status</label>
      <select id={`status-${reportId}`} {...register('status')}>
        {OPERATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <label htmlFor={`count-${reportId}`}>People rescued</label>
      <input id={`count-${reportId}`} type="text" inputMode="numeric"
        aria-describedby={`count-help-${reportId}`}
        {...register('peopleRescued', { setValueAs: parsePeopleRescued })} />
      <span id={`count-help-${reportId}`} className="ops-form__help">Whole number, 0 to 10000.</span>

      <label htmlFor={`note-${reportId}`}>Notes</label>
      <textarea id={`note-${reportId}`} rows={3} maxLength={MAX_NOTE_LENGTH} {...register('note')} />

      {message && <p role="alert" className="error"><span aria-hidden="true">✖</span> {message}</p>}
      {saved && <p role="status" className="success">Update saved.</p>}

      <div className="actions__row">
        <button type="submit" className="btn" disabled={busy}>Submit update</button>
      </div>
    </form>
  );
}
