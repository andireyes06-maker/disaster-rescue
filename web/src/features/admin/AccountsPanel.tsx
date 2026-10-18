import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import Banner from '../../components/calm/Banner';

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  team?: string;
}

export interface AdminTeam { id: string; name: string }

// Roles an admin can assign to staff. A resident account is shown as resident and is never silently changed to another role.
const ROLE_OPTIONS = ['responder', 'dispatcher', 'dmo', 'admin'] as const;

function roleOptionsFor(current: string): string[] {
  return current === 'resident' ? ['resident', ...ROLE_OPTIONS] : [...ROLE_OPTIONS];
}

function failureText(err: unknown, fallback: string): string {
  const f = apiFailure(err);
  if (f?.code === 'last_admin') return 'At least one active admin must remain. Make another admin active first.';
  if (f?.status === 403) return 'You cannot change this account. Admins cannot change their own account.';
  if (f?.status === 400 && f.code === 'role_not_allowed') return 'Only an admin can assign the admin role.';
  return fallback;
}

export default function AccountsPanel({ teams }: { teams: AdminTeam[] }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  // Confirms a created account and says how the person sets a password (F02). No credential is shown here.
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('responder');
  const [team, setTeam] = useState('');
  // Staged role choices per account. Nothing is sent until the admin presses Save.
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Every request in flight. A second action on the same account or the form waits for the first (W11).
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    api('/users').then((res) => setUsers(res as AdminUser[])).catch(() => setError('Could not load accounts.'));
  }, []);

  const busy = (key: string) => pending.has(key);
  const setBusy = (key: string, on: boolean) => setPending((set) => {
    const next = new Set(set);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

  async function saveRole(u: AdminUser) {
    const next = draft[u.uid] ?? u.role;
    if (busy(u.uid) || next === u.role) return;
    setError('');
    setBusy(u.uid, true);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { role: next } });
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, role: next } : x)));
      setDraft((d) => { const { [u.uid]: _, ...rest } = d; return rest; });
    } catch (err) {
      setError(failureText(err, `Could not change the role for ${u.name}. Nothing was changed.`));
    } finally {
      setBusy(u.uid, false);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy('create')) return;
    setError('');
    setNotice('');
    setBusy('create', true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim(), role };
      if (role === 'responder' && team) body.team = team;
      await api('/users', { method: 'POST', body });
      setName('');
      setEmail('');
      setTeam('');
      setNotice('Account created. Ask them to open the sign-in page and choose Forgot password to set their password.');
      setUsers((await api('/users')) as AdminUser[]);
    } catch (err) {
      setError(failureText(err, 'Could not create the account. Check the details; the email may already be in use.'));
    } finally {
      setBusy('create', false);
    }
  }

  return (
    <div className="admin-accounts">
      {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
      {notice && <Banner tone="info" role="status">{notice}</Banner>}
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select id={`role-${u.uid}`} aria-label={`Role for ${u.name}`} value={draft[u.uid] ?? u.role}
                  disabled={busy(u.uid)} onChange={(e) => setDraft((d) => ({ ...d, [u.uid]: e.target.value }))}>
                  {roleOptionsFor(u.role).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {(draft[u.uid] ?? u.role) !== u.role && (
                  <button type="button" className="btn" disabled={busy(u.uid)} onClick={() => saveRole(u)}>
                    {busy(u.uid) ? 'Saving role...' : `Save role for ${u.name}`}
                  </button>
                )}
              </td>
              <td>{u.active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={create} className="admin-accounts__create">
        <h3>Create a staff account</h3>
        <label htmlFor="new-name">New account name</label>
        <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="new-email">New account email</label>
        <input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="new-role">New account role</label>
        <select id="new-role" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {role === 'responder' && (
          <>
            <label htmlFor="new-team">New account team</label>
            <select id="new-team" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">No team yet</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>
        )}
        <button type="submit" className="btn" disabled={busy('create')}>{busy('create') ? 'Creating account...' : 'Create account'}</button>
      </form>
    </div>
  );
}
