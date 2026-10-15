import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client.js';
import { apiFailure } from '../../lib/apiError';
import { teamNameSchema, type TeamName } from '../../lib/schemas';

interface Team {
  id: string;
  name: string;
  busy: boolean;
}

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.code === 'invalid_name') return 'Team names must be 1 to 100 characters.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 404) return 'This team could not be found.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

interface TeamRowProps {
  team: Team;
  onSaved: (text: string) => void;
  onError: (text: string) => void;
}

function TeamRow({ team, onSaved, onError }: TeamRowProps) {
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, watch } = useForm<TeamName>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: { name: team.name },
  });
  const name = watch('name');

  async function save(values: TeamName) {
    setBusy(true);
    try {
      await api(`/teams/${team.id}`, { method: 'PATCH', body: { name: values.name } });
      onSaved('Team renamed.');
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="queue__row card">
      <form onSubmit={handleSubmit(save)} className="ops-form" aria-label={`Team ${team.name}`}>
        <label htmlFor={`team-name-${team.id}`}>Team name</label>
        <input id={`team-name-${team.id}`} maxLength={100} {...register('name')} />
        <span className="queue__meta">Status: {team.busy ? 'Busy on a rescue' : 'Free'}</span>
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !name.trim()}>Save name</button>
        </div>
      </form>
    </li>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<TeamName>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: { name: '' },
  });
  const newName = watch('name');

  const load = useCallback(() => {
    setLoadError(null);
    return api('/teams')
      .then((list: unknown) => setTeams(Array.isArray(list) ? (list as Team[]) : []))
      .catch(() => setLoadError('Could not load teams. Check your connection and try again.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(values: TeamName) {
    setBusy(true);
    setMessage(null);
    try {
      await api('/teams', { method: 'POST', body: { name: values.name } });
      reset({ name: '' });
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
      <form className="card ops-form" onSubmit={handleSubmit(create)} aria-label="Create team">
        <label htmlFor="new-team">New team name</label>
        <input id="new-team" maxLength={100} {...register('name')} />
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
