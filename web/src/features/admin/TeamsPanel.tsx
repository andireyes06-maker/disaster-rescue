import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import FieldError from '../../components/FieldError';
import { useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { teamNameSchema } from '../../lib/schemas';
import Banner from '../../components/calm/Banner';
import type { AdminTeam } from './AccountsPanel';

export default function TeamsPanel({ teams, onChange }: { teams: AdminTeam[]; onChange: (teams: AdminTeam[]) => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const pending = useRef(false);
  const shown = (t: AdminTeam) => edits[t.id] ?? t.name;
  const visibleTeams = teams.filter(team => team.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  async function save(key: string, value: string, team?: AdminTeam) {
    if (pending.current) return;
    const parsed = teamNameSchema.safeParse({ name: value });
    setSaved(''); setError('');
    setFieldErrors(previous => ({ ...previous, [key]: parsed.success ? '' : parsed.error.issues[0].message }));
    if (!parsed.success) { document.getElementById(team ? `team-${team.id}` : 'new-team-name')?.focus(); return; }
    pending.current = true; setBusy(key);
    try {
      if (team) {
        await api(`/teams/${team.id}`, { method: 'PATCH', body: parsed.data });
        if (!parsed.data.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) document.getElementById('admin-team-search')?.focus();
        onChange(teams.map(t => t.id === team.id ? { ...t, name: parsed.data.name } : t));
        setEdits(previous => { const next = { ...previous }; delete next[team.id]; return next; });
        setSaved('Team renamed.');
      } else {
        const result = await api('/teams', { method: 'POST', body: parsed.data }) as { id: string };
        onChange([...teams, { id: result.id, name: parsed.data.name }]);
        setNewName(''); setQuery(''); setSaved('Team created.');
      }
    } catch { setError('Could not save the team. Check your connection and try again.'); }
    finally { pending.current = false; setBusy(null); }
  }
  function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void save('create', newName); }
  return <div className="admin-teams">
    {error && <Banner tone="error" role="alert">{error}</Banner>}
    {saved && <p role="status">{saved}</p>}
    {teams.length === 0 && <div className="calm-empty"><h3>No rescue teams yet</h3><p>Create a team below before assigning responders to it.</p></div>}
    <MotionForm className="admin-teams__create" onSubmit={create} noValidate>
      <h3>Create a team</h3>
      <RequiredNote /><label htmlFor="new-team-name">New team name<RequiredMark /></label>
      <div className="admin-teams__create-controls"><input id="new-team-name" aria-required="true" readOnly={busy !== null} value={newName} aria-invalid={!!fieldErrors.create} aria-describedby={fieldErrors.create ? 'admin-team-create-error' : undefined} onChange={event => setNewName(event.target.value)} />
      <button type="submit" className="btn" aria-disabled={busy !== null} aria-busy={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create team'}</button></div>
      {fieldErrors.create && <FieldError id="admin-team-create-error">{fieldErrors.create}</FieldError>}
    </MotionForm>
    {teams.length > 0 && <div className="admin-teams__directory">
    <h3>Rename a team</h3>
    <label htmlFor="admin-team-search">Find a team</label>
    <input id="admin-team-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search team names" />
    <p className="management-result-count">Showing {visibleTeams.length} of {teams.length} teams.</p>
    {visibleTeams.length === 0 && <p role="status">No teams match this search. <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); document.getElementById('admin-team-search')?.focus(); }}>Clear team search</button></p>}
    {visibleTeams.length > 0 && <ul tabIndex={0} aria-label="Editable rescue teams">{visibleTeams.map(team => <li key={team.id}>
      <div><label className="visually-hidden" htmlFor={`team-${team.id}`}>Name of {team.name}</label>
        <input id={`team-${team.id}`} readOnly={busy !== null} value={shown(team)} aria-invalid={!!fieldErrors[team.id]} aria-describedby={fieldErrors[team.id] ? `team-error-${team.id}` : undefined} onChange={event => setEdits(previous => ({ ...previous, [team.id]: event.target.value }))} />
        {fieldErrors[team.id] && <FieldError id={`team-error-${team.id}`}>{fieldErrors[team.id]}</FieldError>}
      </div>
      <button type="button" className="btn btn--ghost" aria-label={`Save name for ${team.name}`} aria-disabled={busy !== null} aria-busy={busy === team.id} onClick={() => void save(team.id, shown(team), team)}>{busy === team.id ? 'Saving…' : 'Save name'}</button>
    </li>)}</ul>}
    </div>}
  </div>;
}
