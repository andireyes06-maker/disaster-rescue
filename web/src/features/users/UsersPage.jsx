import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client.js';

export const STAFF_ROLE_OPTIONS = ['responder', 'dispatcher', 'dmo'];

function errorText(err) {
  if (err instanceof ApiError || (err && typeof err.status === 'number')) {
    if (err.code === 'email_taken') return 'That email already has an account.';
    if (err.code === 'invalid_email') return 'Enter a valid email address.';
    if (err.code === 'invalid_team') return 'The selected team does not exist.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function UsersPage() {
  const [users, setUsers] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'responder', team: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setLoadError(null);
    return Promise.all([api('/users'), api('/teams')])
      .then(([u, t]) => {
        setUsers(Array.isArray(u) ? u : []);
        setTeams(Array.isArray(t) ? t : []);
      })
      .catch(() => setLoadError('Could not load users. Check your connection and try again.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/users', {
        method: 'POST',
        body: { email: form.email.trim(), name: form.name.trim(), role: form.role, team: form.team || null },
      });
      setForm({ email: '', name: '', role: 'responder', team: '' });
      setMessage({ kind: 'ok', text: 'Staff account created.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function setActive(u, active) {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { active } });
      setMessage({ kind: 'ok', text: active ? 'Account activated.' : 'Account deactivated.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="card ops-form" onSubmit={create} aria-label="Create staff account">
        <label htmlFor="staff-email">Email</label>
        <input id="staff-email" type="email" value={form.email} onChange={set('email')} />
        <label htmlFor="staff-name">Name</label>
        <input id="staff-name" maxLength={100} value={form.name} onChange={set('name')} />
        <label htmlFor="staff-role">Role</label>
        <select id="staff-role" value={form.role} onChange={set('role')}>
          {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label htmlFor="staff-team">Team (optional)</label>
        <select id="staff-team" value={form.team} onChange={set('team')}>
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !form.email.trim() || !form.name.trim()}>Create account</button>
        </div>
      </form>

      {message && (message.kind === 'ok'
        ? <p role="status" className="success">{message.text}</p>
        : <p role="alert" className="error"><span aria-hidden="true">✖</span> {message.text}</p>)}
      {loadError && <p role="alert" className="error"><span aria-hidden="true">✖</span> {loadError}</p>}
      {!loadError && users === null && <p role="status" className="loading">Loading...</p>}
      {users && users.length > 0 && (
        <ul className="queue" aria-label="Users">
          {users.map((u) => (
            <li key={u.uid} className="queue__row card">
              <span className="queue__link">
                <span className="queue__type">{u.name || u.email}</span>
                <span className="plain">{u.email}</span>
              </span>
              <span className="queue__meta">
                <span>{u.role}</span>
                <span>{u.active ? 'Active' : 'Deactivated'}</span>
                <button type="button" className="btn btn--ghost" disabled={busy}
                  onClick={() => setActive(u, !u.active)}>
                  {u.active ? `Deactivate ${u.name || u.email}` : `Activate ${u.name || u.email}`}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
