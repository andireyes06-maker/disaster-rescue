import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';

interface HelpRequest {
  id: string;
  email: string;
  createdAt?: string;
}

// Open "contact an admin" requests from the phone. The administrator resets the account's password to its email address.
export default function PasswordHelpPanel() {
  const [rows, setRows] = useState<HelpRequest[] | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await api('/auth/reset-help');
      setRows(Array.isArray(body) ? (body as HelpRequest[]) : []);
    } catch {
      setRows([]);
      setNotice('Could not load the password help requests.');
    }
  }, []);

  // Live: new requests appear without a page reload. Pauses while a password is being set, so a row never disappears mid-save.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (busy === null) void load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [load, busy]);

  async function resetPassword(row: HelpRequest) {
    setBusy(row.id);
    setConfirming(null);
    setNotice('');
    try {
      await api(`/auth/reset-help/${encodeURIComponent(row.id)}/reset-password`, { method: 'POST' });
      setNotice(`Password for ${row.email} is now their email address. They should change it after signing in.`);
      await load();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setNotice(code === 'no_account' ? `No account uses ${row.email}. Create the account first.` : code === 'forbidden' ? 'Administrator passwords cannot be reset from here.' : `Could not reset the password for ${row.email}. Try again.`);
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
              {confirming === row.id ? (
                <div className="password-help__confirm" role="group" aria-label="Confirm password reset">
                  <p>Reset {row.email}'s password to their email address? Are you sure?</p>
                  <button type="button" className="btn btn--ghost" onClick={() => setConfirming(null)}>Cancel</button>
                  <button type="button" className="btn" disabled={busy !== null} aria-busy={busy === row.id} onClick={() => void resetPassword(row)}>Yes, reset it</button>
                </div>
              ) : (
                <button type="button" className="btn" disabled={busy !== null} onClick={() => setConfirming(row.id)}>Reset password</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
