import { useState } from 'react';
import { api, ApiError } from '../../api/client.js';

export const OPERATION_STATUSES = ['Rescue in Progress', 'Resolved'];
export const MAX_PEOPLE_RESCUED = 10000;
export const MAX_NOTE_LENGTH = 1000;
const COUNT_ERROR = 'People rescued must be a whole number from 0 to 10000.';

// Returns the integer count, or null when the text is not a whole number in range.
export function parsePeopleRescued(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n <= MAX_PEOPLE_RESCUED ? n : null;
}

function errorText(err) {
  if (err instanceof ApiError || (err && typeof err.status === 'number')) {
    if (err.status === 409) return 'This report can no longer be updated. Reload the page to see its latest status.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function OperationForm({ reportId, onSaved }) {
  const [status, setStatus] = useState(OPERATION_STATUSES[0]);
  const [count, setCount] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaved(false);
    const peopleRescued = parsePeopleRescued(count);
    if (peopleRescued === null) {
      setError(COUNT_ERROR);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api(`/reports/${reportId}/updates`, {
        method: 'POST',
        body: { status, peopleRescued, note: note.trim() },
      });
      setSaved(true);
      setNote('');
      if (onSaved) onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ops-form" onSubmit={onSubmit} noValidate aria-label="Rescue operation update">
      <label htmlFor={`status-${reportId}`}>Status</label>
      <select id={`status-${reportId}`} value={status} onChange={(e) => setStatus(e.target.value)}>
        {OPERATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <label htmlFor={`count-${reportId}`}>People rescued</label>
      <input id={`count-${reportId}`} type="text" inputMode="numeric" value={count}
        onChange={(e) => setCount(e.target.value)} aria-describedby={`count-help-${reportId}`} />
      <span id={`count-help-${reportId}`} className="ops-form__help">Whole number, 0 to 10000.</span>

      <label htmlFor={`note-${reportId}`}>Notes</label>
      <textarea id={`note-${reportId}`} rows={3} maxLength={MAX_NOTE_LENGTH} value={note}
        onChange={(e) => setNote(e.target.value)} />

      {error && <p role="alert" className="error"><span aria-hidden="true">✖</span> {error}</p>}
      {saved && <p role="status" className="success">Update saved.</p>}

      <div className="actions__row">
        <button type="submit" className="btn" disabled={busy}>Submit update</button>
      </div>
    </form>
  );
}
