import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  team?: string;
  authSyncPending?: boolean;
}

export interface AdminTeam { id: string; name: string }

// Roles an admin can assign to staff. A resident account is shown as resident and is never silently changed to another role.
// Dispatcher and DMO are not offered; an existing account with one of those roles still shows its current role (roleOptionsFor).
// Every account type an administrator can create. Dispatcher and DMO are retired.
const ROLE_OPTIONS = ['admin', 'responder', 'resident'] as const;

// Teams apply to field staff. Residents and admins have no team.
const TEAM_ROLES = new Set(['responder', 'dispatcher']);

function roleOptionsFor(current: string): string[] {
  return ROLE_OPTIONS.includes(current as typeof ROLE_OPTIONS[number]) ? [...ROLE_OPTIONS] : [current, ...ROLE_OPTIONS];
}

function failureText(err: unknown, fallback: string): string {
  const f = apiFailure(err);
  if (f?.code === 'last_admin') return 'At least one active admin must remain. Make another admin active first.';
  if (f?.status === 401) return 'Your session could not be verified. Sign out and sign in again.';
  if (f?.status === 403) return 'You do not have permission to make this account change.';
  if (f?.status === 400 && f.code === 'role_not_allowed') return 'Only an admin can assign the admin role.';
  return fallback;
}

export default function AccountsPanel({ teams, currentUid, teamsUnavailable = false, rolesOnly = false }: { teams: AdminTeam[]; currentUid?: string; teamsUnavailable?: boolean; rolesOnly?: boolean }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [saved, setSaved] = useState('');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryFocus = useRef(false);
  const retryAccounts = () => { retryFocus.current = true; setAttempt(value => value + 1); };
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  // Confirms a created account and says how the person sets a password (F02). No credential is shown here.
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('responder');
  const [team, setTeam] = useState('');
  // Staged role choices per account. Nothing is sent until the admin presses Save.
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Every request in flight. A second action on the same account or the form waits for the first (W11).
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadFailed(false);
    api('/users').then(res => {
      if (!Array.isArray(res)) throw new Error('Invalid accounts response');
      if (!cancelled) { setUsers(res as AdminUser[]); setRefreshFailed(false); setNeedsRefresh(false); setError(''); }
    }).catch(() => { if (!cancelled) setLoadFailed(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (loading || !retryFocus.current) return;
    retryFocus.current = false;
    if (document.activeElement !== document.body) return;
    document.getElementById(loadFailed ? 'admin-accounts-retry' : 'admin-account-search')?.focus();
  }, [loading, loadFailed]);

  const pendingRef = useRef(new Set<string>());
  const busy = (key: string) => pendingRef.current.has(key);
  const setBusy = (key: string, on: boolean) => {
    if (on) pendingRef.current.add(key); else pendingRef.current.delete(key);
    setPending((set) => {
      const next = new Set(set);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  };
  // The email field is disabled while the create request is pending, so focus moves to it once it is enabled again.
  const emailFocus = useRef(false);
  useEffect(() => {
    if (!emailFocus.current || pending.has('create')) return;
    emailFocus.current = false;
    document.getElementById('new-email')?.focus();
  }, [pending]);

  async function saveRole(u: AdminUser) {
    const next = draft[u.uid] ?? u.role;
    if (u.uid === currentUid || busy(u.uid) || (next === u.role && !u.authSyncPending)) return;
    setError('');
    setSaved('');
    setBusy(u.uid, true);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { role: next } });
      const select = document.getElementById(`role-${u.uid}`) as HTMLSelectElement | null;
      if (select?.parentElement?.contains(document.activeElement)) {
        if (roleFilter && roleFilter !== next) document.getElementById('admin-account-search')?.focus();
        else { select.disabled = false; select.focus(); }
      }
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, role: next, authSyncPending: false } : x)));
      setDraft((d) => { const { [u.uid]: _, ...rest } = d; return rest; });
      setSaved(`Role updated for ${u.name || u.email || u.uid}.`);
    } catch (err) {
      setError(failureText(err, `Could not confirm the role change for ${u.name || u.uid}. Refresh accounts before trying again.`));
      setNeedsRefresh(true);
    } finally {
      setBusy(u.uid, false);
    }
  }

  // Assigns or clears a staff member's team, through the same API as the Users screen (F03).
  async function saveTeam(u: AdminUser, teamId: string) {
    if (busy(u.uid)) return;
    setError('');
    setNotice('');
    setBusy(u.uid, true);
    try {
      await api(`/users/${u.uid}`, { method: 'PATCH', body: { team: teamId || null } });
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, team: teamId || undefined } : x)));
      setNotice(teamId ? `Team assigned for ${u.name}.` : `Team removed for ${u.name}.`);
    } catch (err) {
      setError(failureText(err, `Could not confirm the team change for ${u.name}. Refresh accounts before trying again.`));
    } finally {
      setBusy(u.uid, false);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy('create')) return;
    setSaved('');
    const errors = {
      name: name.trim().length > 0 && name.trim().length <= 100 ? '' : 'Enter a name of up to 100 characters.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.',
    };
    setFieldErrors(errors);
    if (errors.name || errors.email) { document.getElementById(errors.name ? 'new-name' : 'new-email')?.focus(); return; }
    setError('');
    if (password.length < 12 || password.length > 128) {
      setError('Use a first password of 12 to 128 characters.');
      document.getElementById('new-password')?.focus();
      return;
    }
    setNotice('');
    setBusy('create', true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim(), role, password };
      if (role === 'responder' && team && !teamsUnavailable) body.team = team;
      await api('/users', { method: 'POST', body });
      setName('');
      setEmail('');
      setPassword('');
      setTeam('');
      setSaved('');
      setNotice('They can open Sign in and choose Forgot password to set their password.');
      // A successful creation must never become a "creation failed" error if only the refresh fails.
      try {
        const list = await api('/users');
        if (!Array.isArray(list)) throw new Error('Invalid accounts response');
        setUsers(list as AdminUser[]);
        setRefreshFailed(false);
      } catch { setRefreshFailed(true); }
    } catch (err) {
      if (apiFailure(err)?.code === 'email_taken') {
        setFieldErrors(previous => ({ ...previous, email: 'That email already has an account. Use another email or find the existing account above.' }));
        emailFocus.current = true;
        return;
      }
      setError(failureText(err, 'Could not confirm account creation. Search for this email before trying again.'));
    } finally {
      setBusy('create', false);
    }
  }

  if (loading) return <Skeleton label="Loading accounts"><SkeletonRows rows={4} height={64} /></Skeleton>;
  if (loadFailed) return <Banner tone="error" role="alert">Could not load accounts. <button id="admin-accounts-retry" className="btn btn--ghost" type="button" onClick={retryAccounts}>Retry accounts</button></Banner>;
  const visibleUsers = users.filter(user => (!roleFilter || user.role === roleFilter) && [user.name, user.email, user.uid].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));
  return (
    <div className={`admin-accounts${rolesOnly ? " admin-accounts--roles" : ""}`}>
      {error && <Banner tone="error" role="alert"><span>{error}</span></Banner>}
      {needsRefresh && !refreshFailed && <button type="button" className="btn btn--ghost" onClick={retryAccounts}>Refresh accounts</button>}
      {saved && <p role="status">{saved}</p>}
      {notice && <Banner tone="info" role="status">{notice}</Banner>}
      {refreshFailed && <Banner tone="error" role="alert">The account list could not be refreshed. Check it before making another change. <button type="button" className="btn btn--ghost" onClick={retryAccounts}>Refresh accounts</button></Banner>}
      <div className="management-search">
        <div><label htmlFor="admin-account-search">Find an account</label><input id="admin-account-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, or account ID" /></div>
        <div><label htmlFor="admin-role-filter">Filter by role</label><select id="admin-role-filter" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">All roles</option>{Array.from(new Set(['resident', ...ROLE_OPTIONS, ...users.map(user => user.role)])).map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      </div>
      <p className="field-hint" role="status">Showing {visibleUsers.length} of {users.length} accounts.</p>
      {visibleUsers.length === 0 && <div className="calm-empty"><h3>{users.length ? 'No matching accounts' : 'No accounts yet'}</h3><p>{users.length ? 'Try a different name or role.' : rolesOnly ? 'Create an account from Users to grant access.' : 'Create a staff account below to grant access.'}</p>{users.length > 0 && <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setRoleFilter(''); document.getElementById('admin-account-search')?.focus(); }}>Clear account filters</button>}</div>}
      {visibleUsers.length > 0 && <>
      <div className="admin-accounts__list" role="region" aria-label="Accounts and roles list" tabIndex={0}>
      <table>
        <thead><tr><th>Name</th><th>Email / account ID</th><th>Role</th>{!rolesOnly && <th>Team</th>}<th>Status</th></tr></thead>
        <tbody>
          {visibleUsers.map((u) => (
            <tr key={u.uid}>
              <td>{u.name || u.email || u.uid}</td>
              <td className="admin-account-identifier">{u.email || u.uid}</td>
              <td>
                <select id={`role-${u.uid}`} aria-label={`Role for ${u.name}`} value={draft[u.uid] ?? u.role}
                  disabled={u.uid === currentUid || busy(u.uid)} aria-describedby={u.uid === currentUid ? 'admin-own-role-hint' : undefined} onChange={(e) => setDraft((d) => ({ ...d, [u.uid]: e.target.value }))}>
                  {roleOptionsFor(u.role).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {u.uid === currentUid && <p id="admin-own-role-hint" className="field-hint">Your account. Another administrator must change your role.</p>}
                {u.uid !== currentUid && ((draft[u.uid] ?? u.role) !== u.role || u.authSyncPending) && (
                  <button type="button" className="btn" aria-disabled={pending.has(u.uid)} aria-busy={pending.has(u.uid)} onClick={() => saveRole(u)}>
                    {busy(u.uid) ? 'Saving role…' : u.authSyncPending && (draft[u.uid] ?? u.role) === u.role ? `Retry access update for ${u.name || u.uid}` : `Save role for ${u.name || u.uid}`}
                  </button>
                )}
              </td>
              {!rolesOnly && <td>{TEAM_ROLES.has(u.role) ? <select aria-label={`Team for ${u.name}`} value={u.team ?? ''} disabled={u.uid === currentUid || busy(u.uid) || teamsUnavailable} onChange={(e) => saveTeam(u, e.target.value)}><option value="">No team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select> : <span>Not applicable</span>}</td>}
              <td>{u.active ? 'Active' : 'Inactive'}{u.authSyncPending && <p className="field-hint">Access update pending. Retry to finish the previous change.</p>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </>}

      {!rolesOnly && <details className="admin-create-account"><summary>Create a staff account</summary>
      <MotionForm onSubmit={create} noValidate className="admin-accounts__create">
        <p className="field-hint">Enter the staff member’s name and email, then choose their role.</p>
        <RequiredNote /><label htmlFor="new-name">New account name<RequiredMark /></label>
        <input id="new-name" aria-required="true" disabled={pending.has('create')} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'admin-name-error' : undefined} value={name} onChange={(e) => setName(e.target.value)} />
        {fieldErrors.name && <FieldError id="admin-name-error">{fieldErrors.name}</FieldError>}
        <label htmlFor="new-email">New account email<RequiredMark /></label>
        <input id="new-email" aria-required="true" type="email" disabled={pending.has('create')} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="new-password">New account first password<RequiredMark /></label>
        <input id="new-password" aria-required="true" type="password" autoComplete="new-password" disabled={pending.has('create')} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="admin-password-hint" />
        <p id="admin-password-hint" className="field-hint">At least 12 characters. Give it to the person privately.</p>
        {fieldErrors.email && <FieldError id="admin-email-error" role="alert">{fieldErrors.email}</FieldError>}
        <label htmlFor="new-role">New account role<RequiredMark /></label>
        <select id="new-role" aria-required="true" value={role} disabled={pending.has('create')} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {role === 'responder' && (
          <>
            <label htmlFor="new-team">New account team (optional)</label>
            <select id="new-team" value={teamsUnavailable ? '' : team} disabled={teamsUnavailable || pending.has('create')} aria-describedby={teamsUnavailable ? 'admin-teams-unavailable' : undefined} onChange={(e) => setTeam(e.target.value)}>
              <option value="">No team yet</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {teamsUnavailable && <p className="field-hint" id="admin-teams-unavailable">The team list is unavailable. You can create this account without a team, or retry loading Teams first.</p>}
          </>
        )}
        <button type="submit" className="btn" aria-disabled={pending.has('create')} aria-busy={pending.has('create')}>{busy('create') ? 'Creating account...' : 'Create account'}</button>
      </MotionForm>
      </details>}
    </div>
  );
}
