import { useCallback, useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { api } from '../../api/client';
import { getFirebaseAuth } from '../../firebase-auth';

interface HelpRequest {
  id: string;
  email: string;
  createdAt?: string;
}

// Open "contact an admin" requests from the phone. The administrator sends the standard reset email for each one.
export default function PasswordHelpPanel() {
  const [rows, setRows] = useState<HelpRequest[] | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await api('/auth/reset-help');
      setRows(Array.isArray(body) ? (body as HelpRequest[]) : []);
    } catch {
      setRows([]);
      setNotice('Could not load the password help requests.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function send(row: HelpRequest) {
    setBusy(row.id);
    setNotice('');
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), row.email);
      await api(`/auth/reset-help/${encodeURIComponent(row.id)}/close`, { method: 'POST' });
      setNotice(`Reset link sent to ${row.email}.`);
      await load();
    } catch {
      setNotice(`Could not send a reset link to ${row.email}. Check that the address has an account.`);
    } finally {
      setBusy(null);
    }
  }

  if (rows === null) return <p>Loading requests…</p>;
  return (
    <div className="password-help">
      {notice && <p role="status" className="field-hint">{notice}</p>}
      {rows.length === 0 ? (
        <p>No open password help requests.</p>
      ) : (
        <ul className="management-list" aria-label="Open password help requests">
          {rows.map((row) => (
            <li key={row.id} className="management-row">
              <div className="management-identity">
                <strong>{row.email}</strong>
                <small>{row.createdAt ? `Requested ${new Date(row.createdAt).toLocaleString()}` : 'Requested'}</small>
              </div>
              <button type="button" className="btn" disabled={busy !== null} aria-busy={busy === row.id} onClick={() => void send(row)}>
                Send reset link
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
