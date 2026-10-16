import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import Banner from '../../components/calm/Banner';
import type { AdminTeam } from './AccountsPanel';

export default function TeamsPanel({ teams, onChange }: { teams: AdminTeam[]; onChange: (teams: AdminTeam[]) => void }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setNames(Object.fromEntries(teams.map((t) => [t.id, t.name])));
  }, [teams]);

  async function rename(t: AdminTeam) {
    setError('');
    try {
      await api(`/teams/${t.id}`, { method: 'PATCH', body: { name: (names[t.id] ?? '').trim() } });
      onChange(teams.map((x) => (x.id === t.id ? { ...x, name: (names[t.id] ?? '').trim() } : x)));
    } catch {
      setError(`Could not rename ${t.name}. Names must be 1 to 100 characters.`);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      const res = (await api('/teams', { method: 'POST', body: { name: newName.trim() } })) as { id: string };
      onChange([...teams, { id: res.id, name: newName.trim() }]);
      setNewName('');
    } catch {
      setError('Could not create the team. Names must be 1 to 100 characters.');
    }
  }

  return (
    <div className="admin-teams">
      {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
      <ul>
        {teams.map((t) => (
          <li key={t.id}>
            <label className="visually-hidden" htmlFor={`team-${t.id}`}>Name of {t.name}</label>
            <input id={`team-${t.id}`} aria-label={`Name of ${t.name}`} value={names[t.id] ?? ''}
              onChange={(e) => setNames((n) => ({ ...n, [t.id]: e.target.value }))} />
            <button type="button" className="btn btn--ghost" aria-label={`Save name for ${t.name}`} onClick={() => rename(t)}>Save name</button>
          </li>
        ))}
      </ul>
      <form onSubmit={create}>
        <label htmlFor="new-team-name">New team name</label>
        <input id="new-team-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn">Create team</button>
      </form>
    </div>
  );
}
