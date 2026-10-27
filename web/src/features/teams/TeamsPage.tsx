import './teams.css';
import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import { approximatePlaceName } from '../../lib/placeName';
import FieldError from '../../components/FieldError';
import EmptyState from '../../components/calm/EmptyState';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { teamNameSchema, type TeamName } from '../../lib/schemas';
import { currentPosition } from '../../lib/position';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import type { GeoPoint } from '../../types/domain';

// The headquarters as an approximate place name, never coordinates.
function hqText(team: Team): string {
  if (team.hqName) return team.hqName;
  return team.hq ? 'Headquarters set' : 'No headquarters set';
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
  const [editingLocation, setEditingLocation] = useState(false);
  const pendingRef = useRef(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TeamName>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: { name: team.name },
  });
  const name = watch('name');

  const [kind, setKind] = useState(team.kind ?? 'Rescue');
  const [kindLabel, setKindLabel] = useState(team.kindLabel ?? '');

  async function save(values: TeamName) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      await api(`/teams/${team.id}`, { method: 'PATCH', body: { name: values.name, kind, kindLabel: kind === 'Other' ? kindLabel.trim() : undefined } });
      onSaved('Team saved.');
    } catch (err) {
      onError(errorText(err));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <li className="management-row team-row">
      <div className="management-identity"><strong>{team.name} <span className="team-kind">{team.kind === 'Other' && team.kindLabel ? team.kindLabel : team.kind ?? 'Rescue'}</span></strong><small>{team.busy ? 'Assigned to an active rescue' : 'Available for assignment'} · {hqText(team)}</small><span className={`badge badge--${team.busy ? 'high' : 'neutral'}`}>{team.busy ? 'Busy' : 'Available'}</span></div>
      <TeamMembers team={team} members={members} />
      <div className="team-row__actions">
      <button type="button" className="btn btn--ghost team-location-toggle" aria-expanded={editingLocation} onClick={() => setEditingLocation((v) => !v)}>Edit location</button>
      <details className="team-edit"><summary>Edit team</summary>
      <MotionForm onSubmit={handleSubmit(save)} noValidate className="ops-form" aria-label={`Team ${team.name}`}>
        <RequiredNote /><label htmlFor={`team-name-${team.id}`}>Team name<RequiredMark /></label>
        <input aria-required="true" id={`team-name-${team.id}`} maxLength={100} {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? `team-error-${team.id}` : undefined} />
        {errors.name && <FieldError id={`team-error-${team.id}`}>{errors.name.message}</FieldError>}
        <label htmlFor={`team-kind-${team.id}`}>Team identity</label>
        <select id={`team-kind-${team.id}`} value={kind} onChange={(e) => setKind(e.target.value)}>
          {['PNP', 'BFP', 'Rescue', 'MDDRMO', 'Other'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        {kind === 'Other' && (
          <>
            <label htmlFor={`team-kind-label-${team.id}`}>What kind of team is it?</label>
            <input id={`team-kind-label-${team.id}`} maxLength={60} value={kindLabel} onChange={(e) => setKindLabel(e.target.value)} placeholder="For example: Barangay rescue" required />
          </>
        )}
        <div className="actions__row">
          <button type="submit" className="btn" aria-disabled={busy || !name.trim()} aria-busy={busy}>Save team</button>
        </div>
      </MotionForm>
      </details>
      </div>
      {editingLocation && <TeamLocationEditor team={team} onSaved={(t) => { setEditingLocation(false); onSaved(t); }} onError={onError} />}
    </li>
  );
}

// Reports a map click as a coordinate pair.
function HqPicker({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Team headquarters: one map, two ways to place it (current location or a tap on the map), then Save.
function TeamLocationEditor({ team, onSaved, onError }: { team: Team; onSaved: (text: string) => void; onError: (text: string) => void }) {
  const [draft, setDraft] = useState<GeoPoint | null>(team.hq ?? null);
  const [mode, setMode] = useState<'idle' | 'pick'>('idle');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const center: [number, number] = draft ? [draft.lat, draft.lng] : [14.5995, 120.9842];

  async function useCurrent() {
    setBusy(true);
    setNotice('');
    try {
      setDraft(await currentPosition());
      setMode('idle');
    } catch {
      setNotice('Could not read your location. Allow location and try again, or pick on the map.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const hqName = await approximatePlaceName(draft.lat, draft.lng);
      await api(`/teams/${team.id}`, { method: 'PATCH', body: { hq: draft, hqName } });
      onSaved('Location saved.');
    } catch {
      onError('Could not save the location. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="team-hq" aria-labelledby={`hq-title-${team.id}`}>
      <h3 id={`hq-title-${team.id}`}>Location of {team.name}</h3>
      <div className="actions__row">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void useCurrent()}>Use my current location</button>
        <button type="button" className="btn btn--ghost" aria-pressed={mode === 'pick'} disabled={busy} onClick={() => setMode('pick')}>Pick on a map</button>
      </div>
      {notice && <p className="field-hint" role="status">{notice}</p>}
      <div className="hq-map" role="region" aria-label={`Map for ${team.name} location`}>
        <p className="field-hint">{mode === 'pick' ? 'Tap the map to place the location.' : 'Use your location or pick a place on the map.'}</p>
        <MapContainer key={team.id} center={center} zoom={14} style={{ height: 240, width: '100%', borderRadius: 12 }} scrollWheelZoom={false}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap contributors" />
          <HqPicker onPick={(p) => { if (mode === 'pick') { setDraft({ lat: p.lat, lng: p.lng }); setMode('idle'); } }} />
          {draft && <Marker position={[draft.lat, draft.lng]} icon={L.divIcon({ className: 'hq-pin', html: '<span>HQ</span>', iconSize: [36, 22], iconAnchor: [18, 22] })} />}
        </MapContainer>
      </div>
      <p className="field-hint">{draft ? 'Location selected. Save to set it.' : 'No location selected yet.'}</p>
      <div className="actions__row">
        <button type="button" className="btn" disabled={busy || !draft} aria-busy={busy} onClick={() => void save()}>Save location</button>
      </div>
    </section>
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
  const [newKind, setNewKind] = useState('Rescue');
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
      const hqName = newHq ? await approximatePlaceName(newHq.lat, newHq.lng) : null;
      await api('/teams', { method: 'POST', body: { name: values.name, kind: newKind, hq: newHq, hqName } });
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
    <div className="teams-workspace">
      {teams && <dl className="analytics-summary"><div><dt>Rescue teams</dt><dd>{teams.length}</dd></div><div><dt>Available</dt><dd>{teams.filter((team) => !team.busy).length}</dd></div><div><dt>On assignment</dt><dd>{teams.filter((team) => team.busy).length}</dd></div></dl>}
      <div className="management-toolbar"><div><h2>Rescue teams{teams ? ` (${teams.length})` : ''}</h2><p>Availability updates as teams are assigned to rescues.</p></div></div>
      <details className="management-create"><summary className="btn">Create team</summary>
      <MotionForm className="card ops-form" onSubmit={handleSubmit(create)} noValidate aria-label="Create team">
        <RequiredNote /><label htmlFor="new-team">New team name<RequiredMark /></label>
        <input id="new-team" aria-required="true" maxLength={100} {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'new-team-error' : undefined} />
        {errors.name && <FieldError id="new-team-error">{errors.name.message}</FieldError>}
        <label htmlFor="new-team-kind">Team identity</label>
        <select id="new-team-kind" value={newKind} onChange={(e) => setNewKind(e.target.value)}>
          {['PNP', 'BFP', 'Rescue', 'MDDRMO', 'Other'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        {hqNotice && <p className="field-hint" role="status">{hqNotice}</p>}
        <div className="hq-map" role="region" aria-label="Map for the new team headquarters">
          <p className="field-hint">{newHq ? 'Headquarters selected.' : 'Click the map to place the headquarters.'}</p>
          <MapContainer center={newHq ? [newHq.lat, newHq.lng] : [14.5995, 120.9842]} zoom={13} style={{ height: 240, width: '100%', borderRadius: 12 }} scrollWheelZoom={false}>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap contributors" />
            <HqPicker onPick={(p) => { setNewHq({ lat: p.lat, lng: p.lng }); setHqNotice(''); }} />
            {newHq && <Marker position={[newHq.lat, newHq.lng]} icon={L.divIcon({ className: 'hq-pin', html: '<span>HQ</span>', iconSize: [36, 22], iconAnchor: [18, 22] })} />}
          </MapContainer>
        </div>
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
