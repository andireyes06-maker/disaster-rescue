import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';

interface HelpRequest {
  id: string;
  email: string;
  createdAt?: string;
}

// Open "contact an admin" requests from the phone. The administrator sets a new password for the account directly.
const MIN_PASSWORD = 10;
export default function PasswordHelpPanel() {
  const [rows, setRows] = useState<HelpRequest[] | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});

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

  async function setPassword(row: HelpRequest) {
    const password = passwords[row.id] ?? '';
    if (password.length < MIN_PASSWORD) {
      setNotice(`The new password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(row.id);
    setNotice('');
    try {
      await api(`/auth/reset-help/${encodeURIComponent(row.id)}/set-password`, { method: 'POST', body: { password } });
      setPasswords((p) => ({ ...p, [row.id]: '' }));
      setNotice(`Password set for ${row.email}. Tell them the new password privately.`);
      await load();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setNotice(code === 'no_account' ? `No account uses ${row.email}. Create the account first.` : `Could not set the password for ${row.email}. Try again.`);
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
              <form className="password-help__set" onSubmit={(e) => { e.preventDefault(); void setPassword(row); }}>
                <label htmlFor={`pw-${row.id}`}>New password (at least {MIN_PASSWORD} characters)</label>
                <input id={`pw-${row.id}`} type="password" autoComplete="new-password" value={passwords[row.id] ?? ''} onChange={(e) => setPasswords((p) => ({ ...p, [row.id]: e.target.value }))} required />
                <button type="submit" className="btn" disabled={busy !== null} aria-busy={busy === row.id}>Set password</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
