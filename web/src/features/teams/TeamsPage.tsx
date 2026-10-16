import EmptyState from '../../components/calm/EmptyState';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { teamNameSchema, type TeamName } from '../../lib/schemas';

import type { Team } from '../../types/domain';
import Banner from '../../components/calm/Banner';

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
    <li className="management-row">
      <div className="management-identity"><strong>{team.name}</strong><small>{team.busy ? 'Assigned to an active rescue' : 'Available for assignment'}</small><span className={`badge badge--${team.busy ? 'high' : 'neutral'}`}>{team.busy ? 'Busy' : 'Available'}</span></div>
      <details className="team-edit"><summary>Edit name</summary>
      <form onSubmit={handleSubmit(save)} className="ops-form" aria-label={`Team ${team.name}`}>
        <label htmlFor={`team-name-${team.id}`}>Team name</label>
        <input id={`team-name-${team.id}`} maxLength={100} {...register('name')} />
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !name.trim()}>Save name</button>
        </div>
      </form>
      </details>
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
      <div className="management-toolbar"><div><h2>Rescue teams{teams ? ` (${teams.length})` : ''}</h2><p>Availability updates as teams are assigned to rescues.</p></div></div>
      <details className="management-create"><summary className="btn">Create team</summary>
      <form className="card ops-form" onSubmit={handleSubmit(create)} aria-label="Create team">
        <label htmlFor="new-team">New team name</label>
        <input id="new-team" maxLength={100} {...register('name')} />
        <div className="actions__row">
          <button type="submit" className="btn" disabled={busy || !newName.trim()}>Create team</button>
        </div>
      </form>
      </details>

      {message && (message.kind === 'ok'
        ? <Banner tone="info" role="status">{message.text}</Banner>
        : <Banner tone="error" role="alert"><span aria-hidden="true">✖</span> {message.text}</Banner>)}
      {loadError && <Banner tone="error" role="alert">{loadError} <button className="btn btn--ghost" type="button" onClick={load}>Try again</button></Banner>}
      {!loadError && teams === null && <p role="status" className="loading">Loading...</p>}
      {teams && teams.length === 0 && (
        <EmptyState title="No teams yet" body="Choose Create team to add the first rescue team." />
      )}
      {teams && teams.length > 0 && (
        <ul className="management-list" aria-label="Teams">
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
