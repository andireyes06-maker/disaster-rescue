import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
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

const ROLE_OPTIONS = ['responder', 'dispatcher', 'dmo', 'admin'] as const;

export default function AccountsPanel({ teams }: { teams: AdminTeam[] }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('responder');
  const [team, setTeam] = useState('');

  useEffect(() => {
    api('/users').then((res) => setUsers(res as AdminUser[])).catch(() => setError('Could not load accounts.'));
  }, []);

  async function changeRole(u: AdminUser, next: string) {
    setError('');
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { role: next } });
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, role: next } : x)));
    } catch {
      setError(`Could not change the role for ${u.name}.`);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim(), role };
      if (role === 'responder' && team) body.team = team;
      await api('/users', { method: 'POST', body });
      setName('');
      setEmail('');
      setTeam('');
      setUsers((await api('/users')) as AdminUser[]);
    } catch {
      setError('Could not create the account. Check the details; the email may already be in use.');
    }
  }

  return (
    <div className="admin-accounts">
      {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select id={`role-${u.uid}`} aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
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
        <button type="submit" className="btn">Create account</button>
      </form>
    </div>
  );
}
