import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import { useAuth } from '../../auth/AuthProvider';
import MotionForm from '../../components/MotionForm';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { staffAccountSchema, STAFF_ROLE_OPTIONS, type StaffAccount } from '../../lib/schemas';
import EmptyState from '../../components/calm/EmptyState';
import FieldError from '../../components/FieldError';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';

interface User {
  uid: string;
  email: string;
  name?: string | null;
  role: string;
  active: boolean;
  team?: string | null;
}

// Teams apply to field staff. Residents and admins have no team.
const TEAM_ROLES = new Set(['responder', 'dispatcher']);

type Team = Pick<import('../../types/domain').Team, 'id' | 'name'>;

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

const EMPTY_ACCOUNT: StaffAccount = { email: '', name: '', role: 'responder', team: '', password: '' };

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.code === 'email_taken') return 'That email already has an account.';
    if (failure.code === 'invalid_email') return 'Enter a valid email address.';
    if (failure.code === 'invalid_team') return 'The selected team does not exist.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm the account change. Refresh the account list before trying again.';
}

export default function UsersPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState<User[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A team change waits for the administrator's confirmation.
  const [pendingMove, setPendingMove] = useState<{ user: User; team: string } | null>(null);
  const teamNameOf = (id: string | null | undefined) => (id ? teams.find((t) => t.id === id)?.name ?? 'their team' : 'no team');
  function askTeamChange(u: User, team: string) {
    if ((u.team ?? '') === team) return;
    setPendingMove({ user: u, team });
  }
  const pendingRef = useRef(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StaffAccount>({
    resolver: zodResolver(staffAccountSchema),
    defaultValues: EMPTY_ACCOUNT,
  });
  const email = watch('email');
  const fullName = watch('name');
  const role = watch('role');

  const load = useCallback(() => {
    setLoadError(null);
    return Promise.all([api('/users'), api('/teams')])
      .then(([u, t]: [unknown, unknown]) => {
        if (!Array.isArray(u) || !Array.isArray(t)) throw new Error('Invalid account or team response');
        setUsers(Array.isArray(u) ? (u as User[]) : []);
        setTeams(Array.isArray(t) ? (t as Team[]) : []);
      })
      .catch(() => setLoadError('Could not load users. Check your connection and try again.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(values: StaffAccount) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await api('/users', {
        method: 'POST',
        body: {
          email: values.email,
          name: values.name,
          password: values.password,
          role: values.role,
          team: values.role === 'responder' ? values.team || null : null,
        },
      });
      reset(EMPTY_ACCOUNT);
      setMessage(null);
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  async function setActive(u: User, active: boolean) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { active } });
      setMessage({ kind: 'ok', text: active ? 'Account activated.' : 'Account deactivated.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  // Assigns or clears a staff member's team (F03). The API validates the team and records the change.
  async function setTeam(u: User, team: string) {
    setPendingMove(null);
    setBusy(true);
    setMessage(null);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { team: team || null } });
      setMessage({ kind: 'ok', text: team ? 'Team assigned.' : 'Team removed.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const visibleUsers = users?.filter(u => (!roleFilter || u.role === roleFilter) && [u.name, u.email, u.uid].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));
  return (
    <div className="users-workspace">
      {pendingMove && (
        <div className="incident-modal">
          <section className="incident-modal__panel" role="dialog" aria-modal="true" aria-labelledby="move-team-title" style={{ width: 'min(440px, 100%)' }}>
            <header className="incident-modal__header">
              <h2 id="move-team-title">Are you sure?</h2>
            </header>
            <div className="incident-modal__body">
              <p>
                Move {pendingMove.user.name || pendingMove.user.email} from {teamNameOf(pendingMove.user.team)} to {teamNameOf(pendingMove.team)}?
                This is recorded in the audit log.
              </p>
              <div className="actions__row">
                <button type="button" className="btn btn--ghost" onClick={() => setPendingMove(null)}>Cancel</button>
                <button type="button" className="btn" disabled={busy} onClick={() => void setTeam(pendingMove.user, pendingMove.team)}>Move</button>
              </div>
            </div>
          </section>
        </div>
      )}
      <div className="management-toolbar"><div><h2>Accounts{users ? ` (${users.length})` : ''}</h2><p>Review access before changing an account’s status. <Link to="/admin?panel=roles">Manage access roles</Link></p></div></div>
      <details className="management-create"><summary className="btn">Create staff account</summary>
      <MotionForm className="card ops-form" onSubmit={handleSubmit(create)} noValidate aria-label="Create staff account">
        <RequiredNote /><label htmlFor="staff-email">Email<RequiredMark /></label>
        <input id="staff-email" aria-required="true" type="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'staff-email-error' : undefined} />
        {errors.email && <FieldError id="staff-email-error">{errors.email.message}</FieldError>}
        <label htmlFor="staff-name">Name<RequiredMark /></label>
        <input id="staff-name" aria-required="true" maxLength={100} {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'staff-name-error' : undefined} />
        {errors.name && <FieldError id="staff-name-error">{errors.name.message}</FieldError>}
        <label htmlFor="staff-role">Role<RequiredMark /></label>
        <select id="staff-role" aria-required="true" {...register('role')}>
          {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label htmlFor="staff-password">First password<RequiredMark /></label>
        <input id="staff-password" aria-required="true" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'staff-password-error' : 'staff-password-hint'} />
        <p id="staff-password-hint" className="field-hint">At least 12 characters. Give it to the person privately; they can change it after signing in.</p>
        {errors.password && <FieldError id="staff-password-error">{errors.password.message}</FieldError>}
        {role === 'responder' && (
          <>
            <label htmlFor="staff-team">Team (rescuers only)</label>
            <select id="staff-team" {...register('team')}>
              <option value="">No team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>
        )}
        <div className="actions__row">
          <button type="submit" className="btn" aria-disabled={busy || !email.trim() || !fullName.trim()} aria-busy={busy}>Create account</button>
        </div>
      </MotionForm>
      </details>

      {message && (message.kind === 'ok'
        ? <Banner tone="info" role="status">{message.text}</Banner>
        : <Banner tone="error" role="alert">{message.text}</Banner>)}
      {loadError && <Banner tone="error" role="alert">{loadError} <button className="btn btn--ghost" type="button" onClick={load}>Try again</button></Banner>}
      {!loadError && users === null && <Skeleton label="Loading accounts"><SkeletonRows rows={4} height={80} /></Skeleton>}
      {users && <>
        <div className="management-search">
          <div><label htmlFor="account-search">Find an account</label><input id="account-search" type="search" placeholder="Name, email, or account ID" value={query} onChange={event => setQuery(event.target.value)} /></div>
          <div><label htmlFor="account-role-filter">Account role</label><select id="account-role-filter" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">All roles</option>{Array.from(new Set(['resident', 'responder', 'admin', ...(users ?? []).map(u => u.role)])).map(role => <option key={role} value={role}>{role}</option>)}</select></div>
        </div>
        <p className="management-result-count" role="status">Showing {visibleUsers?.length} of {users.length} accounts</p>
        {visibleUsers?.length === 0 && <EmptyState title={users.length ? 'No matching accounts' : 'No accounts yet'} body={users.length ? 'Try a different name or role.' : 'Create a staff account to grant access to your team.'} action={users.length ? <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setRoleFilter(''); document.getElementById('account-search')?.focus(); }}>Clear account filters</button> : undefined} />}
      </>}
      {visibleUsers && visibleUsers.length > 0 && (
        <ul className="management-list" aria-label="Users">
          {visibleUsers.map((u) => (
            <li key={u.uid} className="management-row">
              <div className="management-identity">
                <strong>{u.name || u.email}</strong>
                <small>{u.email || u.uid}</small>
                <span className="badge badge--neutral">{u.role}</span>
              </div>
              <div className="management-actions">
                <span>{u.active ? 'Active' : 'Deactivated'}</span>
                {TEAM_ROLES.has(u.role) && u.uid !== user?.uid && <label className="management-team"><span>Team</span><select aria-label={`Team for ${u.name || u.email}`} value={u.team ?? ''} disabled={busy} onChange={e => askTeamChange(u, e.target.value)}><option value="">No team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
                {u.uid === user?.uid ? <span className="field-hint">Your account</span> : <button type="button" className="btn btn--ghost" aria-disabled={busy} aria-busy={busy}
                  aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.name || u.email}`}
                  onClick={() => setActive(u, !u.active)}>
                  {u.active ? 'Deactivate' : 'Activate'}
                </button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
