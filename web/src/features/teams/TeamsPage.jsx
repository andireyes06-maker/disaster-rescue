import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client.js';

function errorText(err) {
  if (err instanceof ApiError || (err && typeof err.status === 'number')) {
    if (err.code === 'invalid_name') return 'Team names must be 1 to 100 characters.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 404) return 'This team could not be found.';
    if (err.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function TeamRow({ team, onSaved, onError }) {
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/teams/${team.id}`, { method: 'PATCH', body: { name: name.trim() } });
      onSaved('Team renamed.');
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="queue__row card">
      <form onSubmit={save} className="ops-form" aria-label={`Team ${team.name}`}>
        <label htmlFor={`team-name-${team.id}`}>Team name</label>
        <input id={`team-name-${team.id}`} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <span className="queue__meta">Status: {team.busy ? 'Busy on a rescue' : 'Free'}</span>
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !name.trim()}>Save name</button>
        </div>
      </form>
    </li>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setLoadError(null);
    return api('/teams')
      .then((list) => setTeams(Array.isArray(list) ? list : []))
      .catch(() => setLoadError('Could not load teams. Check your connection and try again.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/teams', { method: 'POST', body: { name: newName.trim() } });
      setNewName('');
      setMessage({ kind: 'ok', text: 'Team created.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="card ops-form" onSubmit={create} aria-label="Create team">
        <label htmlFor="new-team">New team name</label>
        <input id="new-team" maxLength={100} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !newName.trim()}>Create team</button>
        </div>
      </form>

      {message && (message.kind === 'ok'
        ? <p role="status" className="success">{message.text}</p>
        : <p role="alert" className="error"><span aria-hidden="true">✖</span> {message.text}</p>)}
      {loadError && <p role="alert" className="error"><span aria-hidden="true">✖</span> {loadError}</p>}
      {!loadError && teams === null && <p role="status" className="loading">Loading...</p>}
      {teams && teams.length === 0 && <p className="card empty">No teams yet.</p>}
      {teams && teams.length > 0 && (
        <ul className="queue" aria-label="Teams">
          {teams.map((t) => (
            <TeamRow key={t.id} team={t}
              onSaved={(text) => { setMessage({ kind: 'ok', text }); load(); }}
              onError={(text) => setMessage({ kind: 'error', text })} />
          ))}
        </ul>
      )}
    </div>
  );
}
