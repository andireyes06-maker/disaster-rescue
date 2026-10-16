import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { staffAccountSchema, STAFF_ROLE_OPTIONS, type StaffAccount } from '../../lib/schemas';
import Banner from '../../components/calm/Banner';

interface User {
  uid: string;
  email: string;
  name?: string | null;
  role: string;
  active: boolean;
}

type Team = Pick<import('../../types/domain').Team, 'id' | 'name'>;

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

const EMPTY_ACCOUNT: StaffAccount = { email: '', name: '', role: 'responder', team: '' };

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.code === 'email_taken') return 'That email already has an account.';
    if (failure.code === 'invalid_email') return 'Enter a valid email address.';
    if (failure.code === 'invalid_team') return 'The selected team does not exist.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<StaffAccount>({
    resolver: zodResolver(staffAccountSchema),
    defaultValues: EMPTY_ACCOUNT,
  });
  const email = watch('email');
  const fullName = watch('name');

  const load = useCallback(() => {
    setLoadError(null);
    return Promise.all([api('/users'), api('/teams')])
      .then(([u, t]: [unknown, unknown]) => {
        setUsers(Array.isArray(u) ? (u as User[]) : []);
        setTeams(Array.isArray(t) ? (t as Team[]) : []);
      })
      .catch(() => setLoadError('Could not load users. Check your connection and try again.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(values: StaffAccount) {
    setBusy(true);
    setMessage(null);
    try {
      await api('/users', {
        method: 'POST',
        body: { email: values.email, name: values.name, role: values.role, team: values.team || null },
      });
      reset(EMPTY_ACCOUNT);
      setMessage({ kind: 'ok', text: 'Staff account created.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function setActive(u: User, active: boolean) {
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
      <div className="management-toolbar"><div><h2>Accounts{users ? ` (${users.length})` : ''}</h2><p>Review access before changing an account’s status.</p></div></div>
      <details className="management-create"><summary className="btn">Create staff account</summary>
      <form className="card ops-form" onSubmit={handleSubmit(create)} aria-label="Create staff account">
        <label htmlFor="staff-email">Email</label>
        <input id="staff-email" type="email" {...register('email')} />
        <label htmlFor="staff-name">Name</label>
        <input id="staff-name" maxLength={100} {...register('name')} />
        <label htmlFor="staff-role">Role</label>
        <select id="staff-role" {...register('role')}>
          {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label htmlFor="staff-team">Team (optional)</label>
        <select id="staff-team" {...register('team')}>
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !email.trim() || !fullName.trim()}>Create account</button>
        </div>
      </form>
      </details>

      {message && (message.kind === 'ok'
        ? <Banner tone="info" role="status">{message.text}</Banner>
        : <Banner tone="error" role="alert"><span aria-hidden="true">✖</span> {message.text}</Banner>)}
      {loadError && <Banner tone="error" role="alert">{loadError} <button className="btn btn--ghost" type="button" onClick={load}>Try again</button></Banner>}
      {!loadError && users === null && <p role="status" className="loading">Loading...</p>}
      {users && users.length > 0 && (
        <ul className="management-list" aria-label="Users">
          {users.map((u) => (
            <li key={u.uid} className="management-row">
              <div className="management-identity">
                <strong>{u.name || u.email}</strong>
                <small>{u.email}</small>
                <span className="badge badge--neutral">{u.role}</span>
              </div>
              <div className="management-actions">
                <span>{u.active ? 'Active' : 'Deactivated'}</span>
                <button type="button" className="btn btn--ghost" disabled={busy}
                  aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.name || u.email}`}
                  onClick={() => setActive(u, !u.active)}>
                  {u.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
