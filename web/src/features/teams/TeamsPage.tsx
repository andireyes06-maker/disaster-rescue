import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import FieldError from '../../components/FieldError';
import EmptyState from '../../components/calm/EmptyState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { teamNameSchema, type TeamName } from '../../lib/schemas';
import { currentPosition } from '../../lib/position';
import type { GeoPoint } from '../../types/domain';

function hqText(hq?: GeoPoint | null): string {
  return hq ? `HQ ${hq.lat.toFixed(4)}, ${hq.lng.toFixed(4)}` : 'No headquarters set';
}

import type { Team } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';

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
  return 'Could not confirm the team change. Refresh the team list before trying again.';
}

interface StaffMember {
  uid: string;
  name?: string | null;
  email?: string;
  role: string;
  active: boolean;
  team?: string | null;
}

const ROLE_LABEL: Record<string, string> = { responder: 'Rescuer', admin: 'Administrator' };

function TeamMembers({ team, members }: { team: Team; members: StaffMember[] }) {
  if (members.length === 0) return <small className="team-members__empty">No members yet</small>;
  return (
    <ul className="team-members" aria-label={`Members of ${team.name}`}>
      {members.map((m) => (
        <li key={m.uid}><strong>{m.name || m.email || 'Unnamed'}</strong> <small>{ROLE_LABEL[m.role] ?? m.role}</small></li>
      ))}
    </ul>
  );
}

interface TeamRowProps {
  team: Team;
  members: StaffMember[];
  onSaved: (text: string) => void;
  onError: (text: string) => void;
}

function TeamRow({ team, members, onSaved, onError }: TeamRowProps) {
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TeamName>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: { name: team.name },
  });
  const name = watch('name');

  async function save(values: TeamName) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      await api(`/teams/${team.id}`, { method: 'PATCH', body: { name: values.name } });
      onSaved('Team renamed.');
    } catch (err) {
      onError(errorText(err));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <li className="management-row">
      <div className="management-identity"><strong>{team.name}</strong><small>{team.busy ? 'Assigned to an active rescue' : 'Available for assignment'} · {hqText(team.hq)}</small><span className={`badge badge--${team.busy ? 'high' : 'neutral'}`}>{team.busy ? 'Busy' : 'Available'}</span></div>
      <TeamMembers team={team} members={members} />
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={async () => { setBusy(true); try { const hq = await currentPosition(); await api(`/teams/${team.id}`, { method: 'PATCH', body: { hq } }); onSaved('Headquarters set to your current location.'); } catch { onError('Could not set headquarters. Allow location and try again.'); } finally { setBusy(false); } }}>Set headquarters to my location</button>
      <details className="team-edit"><summary>Edit name</summary>
      <MotionForm onSubmit={handleSubmit(save)} noValidate className="ops-form" aria-label={`Team ${team.name}`}>
        <RequiredNote /><label htmlFor={`team-name-${team.id}`}>Team name<RequiredMark /></label>
        <input aria-required="true" id={`team-name-${team.id}`} maxLength={100} {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? `team-error-${team.id}` : undefined} />
        {errors.name && <FieldError id={`team-error-${team.id}`}>{errors.name.message}</FieldError>}
        <div className="actions__row">
          <button type="submit" className="btn" aria-disabled={busy || !name.trim()} aria-busy={busy}>Save name</button>
        </div>
      </MotionForm>
      </details>
    </li>
  );
}

export default function TeamsPage() {
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState('');
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TeamName>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: { name: '' },
  });
  const newName = watch('name');
  const [newHq, setNewHq] = useState<GeoPoint | null>(null);
  const [hqNotice, setHqNotice] = useState('');

  const [staff, setStaff] = useState<StaffMember[]>([]);

  const load = useCallback(() => {
    setLoadError(null);
    return api('/teams')
      .then((list: unknown) => { if (!Array.isArray(list)) throw new Error('Invalid teams response'); setTeams(list as Team[]); })
      .catch(() => setLoadError('Could not load teams. Check your connection and try again.'))
      .then(() => api('/users'))
      .then((list: unknown) => { if (Array.isArray(list)) setStaff(list as StaffMember[]); })
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(values: TeamName) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await api('/teams', { method: 'POST', body: { name: values.name, hq: newHq } });
      reset({ name: '' });
      setNewHq(null);
      setHqNotice('');
      setMessage({ kind: 'ok', text: 'Team created.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  const visibleTeams = teams?.filter(team => team.name.toLowerCase().includes(query.trim().toLowerCase()) && (!availability || (availability === 'busy') === team.busy));
  return (
    <div>
      {teams && <dl className="analytics-summary"><div><dt>Rescue teams</dt><dd>{teams.length}</dd></div><div><dt>Available</dt><dd>{teams.filter((team) => !team.busy).length}</dd></div><div><dt>On assignment</dt><dd>{teams.filter((team) => team.busy).length}</dd></div></dl>}
      <div className="management-toolbar"><div><h2>Rescue teams{teams ? ` (${teams.length})` : ''}</h2><p>Availability updates as teams are assigned to rescues.</p></div></div>
      <details className="management-create"><summary className="btn">Create team</summary>
      <MotionForm className="card ops-form" onSubmit={handleSubmit(create)} noValidate aria-label="Create team">
        <RequiredNote /><label htmlFor="new-team">New team name<RequiredMark /></label>
        <input id="new-team" aria-required="true" maxLength={100} {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'new-team-error' : undefined} />
        {errors.name && <FieldError id="new-team-error">{errors.name.message}</FieldError>}
        {hqNotice && <p className="field-hint" role="status">{hqNotice}</p>}
        <div className="actions__row">
          <button type="button" className="btn btn--ghost" onClick={async () => { try { setNewHq(await currentPosition()); setHqNotice('Headquarters captured from your current location.'); } catch { setHqNotice('Could not read your location. Allow location and try again, or create the team without headquarters.'); } }}>Use my current location as headquarters</button>
          <button type="submit" className="btn" aria-disabled={busy || !newName.trim()} aria-busy={busy}>Create team</button>
        </div>
      </MotionForm>
      </details>

      {message && (message.kind === 'ok'
        ? <Banner tone="info" role="status">{message.text}</Banner>
        : <Banner tone="error" role="alert">{message.text}</Banner>)}
      {loadError && <Banner tone="error" role="alert">{loadError} <button className="btn btn--ghost" type="button" onClick={load}>Try again</button></Banner>}
      {!loadError && teams === null && <Skeleton label="Loading teams"><SkeletonRows rows={4} height={80} /></Skeleton>}
      {teams && teams.length === 0 && (
        <EmptyState title="No teams yet" body="Choose Create team to add the first rescue team." />
      )}
      {teams && teams.length > 0 && <>
        <div className="management-search">
          <div><label htmlFor="team-search">Find a team</label><input id="team-search" type="search" placeholder="Search team names" value={query} onChange={event => setQuery(event.target.value)} /></div>
          <div><label htmlFor="team-availability">Availability</label><select id="team-availability" value={availability} onChange={event => setAvailability(event.target.value)}><option value="">All teams</option><option value="available">Available</option><option value="busy">On assignment</option></select></div>
        </div>
        <p className="management-result-count" role="status">Showing {visibleTeams?.length} of {teams.length} teams</p>
        {visibleTeams?.length === 0 && <EmptyState title="No matching teams" body="Try a different team name or availability." action={<button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setAvailability(''); document.getElementById('team-search')?.focus(); }}>Clear team filters</button>} />}
      </>}
      {visibleTeams && visibleTeams.length > 0 && (
        <ul className="management-list" aria-label="Teams">
          {visibleTeams.map((t) => (
            <TeamRow key={t.id} team={t}
              members={staff.filter((m) => m.active && m.team === t.id && m.role !== 'resident')}
              onSaved={(text) => { setMessage({ kind: 'ok', text }); load(); }}
              onError={(text) => setMessage({ kind: 'error', text })} />
          ))}
        </ul>
      )}
    </div>
  );
}
