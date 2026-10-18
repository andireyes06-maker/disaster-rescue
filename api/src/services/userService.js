import { HttpError } from '../errors.js';
import { record } from './auditService.js';
import { PHONE_RE, sanitizeText } from '../domain/validation.js';

const STAFF_ROLES = ['resident', 'responder', 'dispatcher', 'dmo'];
const ADMIN_ROLES = [...STAFF_ROLES, 'admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const badName = () => new HttpError(400, 'invalid_name', 'Name must be 1 to 100 characters');
// Reject over-long names rather than truncating them: sanitizeText alone would cut to 100.
const cleanName = (v) => {
  const n = typeof v === 'string' ? sanitizeText(v, 10000) : '';
  if (!n || n.length > 100) throw badName();
  return n;
};

// Dispatcher creates staff. Dispatchers may never create admins.
// Account changes are audited by actor and target. Passwords, tokens, and contact details are never recorded.
async function auditAccount(repo, caller, action, target, after, before) {
  try {
    await record(repo, { actorUid: caller?.uid ?? null, action, reportId: undefined, before: before ?? undefined, after: { target: target.uid, ...after } });
  } catch (e) {
    console.error('account audit write failed', e);
  }
}

export async function createStaff({ repo, auth }, body, caller = { role: 'dispatcher' }) {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email', 'A valid email is required');
  const name = cleanName(body?.name);
  const role = body?.role;
  if (role === 'admin' && caller.role !== 'admin') throw new HttpError(400, 'role_not_allowed', 'Dispatchers cannot create admins');
  if (!(caller.role === 'admin' ? ADMIN_ROLES : STAFF_ROLES).includes(role)) throw new HttpError(400, 'invalid_role', 'Unknown role');
  const team = body?.team == null ? null : body.team;
  if (team !== null && (typeof team !== 'string' || !(await repo.getTeam(team)))) {
    throw new HttpError(400, 'invalid_team', 'Team does not exist');
  }

  let account;
  try {
    account = await auth.createUser({ email, displayName: name });
  } catch (e) {
    if (e?.code === 'auth/email-already-exists') throw new HttpError(409, 'email_taken', 'That email already has an account');
    throw e;
  }
  const { uid } = account;
  try {
    await repo.createUser(uid, { name, email, role, team, active: true, createdAt: new Date() });
    await auth.setCustomUserClaims(uid, { role, active: true, ...(team ? { team } : {}) });
  } catch (e) {
    // Do not leave an account that has no matching users doc or claims.
    try { await auth.deleteUser(uid); } catch (de) { console.error('orphan account cleanup failed', de); }
    throw e;
  }
  await auditAccount(repo, caller, 'user.create', { uid }, { role, active: true, team });
  return { uid, role, team };
}

export async function updateStaff({ repo, auth }, id, body, caller) {
  const isAdmin = caller.role === 'admin';
  const user = await repo.getUser(id);
  if (!user) throw new HttpError(404, 'not_found', 'User not found');
  // Dispatchers cannot touch admins. Nobody can change their own account, so nobody can lock themselves out.
  if (user.role === 'admin' && !isAdmin) throw new HttpError(403, 'forbidden', 'Dispatchers cannot modify admins');
  if (id === caller.uid) throw new HttpError(403, 'forbidden', 'You cannot change your own account');
  const hasRole = body?.role !== undefined;
  const hasActive = body?.active !== undefined;
  const hasTeam = body?.team !== undefined;
  if (!hasRole && !hasActive && !hasTeam) throw new HttpError(400, 'nothing_to_update', 'Send role, active, and/or team');
  if (hasRole && body.role === 'admin' && !isAdmin) throw new HttpError(400, 'role_not_allowed', 'Dispatchers cannot assign admins');
  if (hasRole && !(isAdmin ? ADMIN_ROLES : STAFF_ROLES).includes(body.role)) throw new HttpError(400, 'invalid_role', 'Unknown role');
  if (hasActive && typeof body.active !== 'boolean') throw new HttpError(400, 'invalid_active', 'active must be true or false');
  // A team is an existing team id, or null to remove the account from its team. The same rule as creation applies.
  if (hasTeam && body.team !== null && (typeof body.team !== 'string' || !(await repo.getTeam(body.team)))) {
    throw new HttpError(400, 'invalid_team', 'Team does not exist');
  }

  const role = hasRole ? body.role : user.role;
  const active = hasActive ? body.active : user.active === true;
  const team = hasTeam ? body.team : (user.team ?? null);

  // Every decision that depends on the target's current state is made inside the same transaction that
  // writes it. The guard receives the target and the other active admins as read in that transaction (review).
  // A stale read taken above therefore cannot authorize the change.
  let prior = null;
  const guard = (target, otherActiveAdmins) => {
    if (!target) return 'not_found';
    const targetActive = target.active === true;
    if (target.role === 'admin' && !isAdmin) return 'forbidden';
    if (target.role !== user.role || targetActive !== (user.active === true) || (target.team ?? null) !== (user.team ?? null)) return 'changed';
    const removesAdmin = target.role === 'admin' && targetActive && (role !== 'admin' || !active);
    if (removesAdmin && otherActiveAdmins.length === 0) return 'last_admin';
    prior = { role: target.role, active: targetActive, team: target.team ?? null, authSyncPending: target.authSyncPending === true };
    return null;
  };
  // The users document is canonical: rules read it, so the old access stops here first. Auth follows.
  // authSyncPending stays true until Auth is updated; a retry of the same change completes it.
  const result = await repo.setStaffGuarded(id, { role, active, team, authSyncPending: true }, guard);
  if (!result.ok) {
    const refused = {
      not_found: [404, 'not_found', 'User not found'],
      changed: [409, 'stale_user', 'This account was changed by someone else. Reload and try again.'],
      forbidden: [403, 'forbidden', 'Dispatchers cannot modify admins'],
      last_admin: [409, 'last_admin', 'At least one active admin must remain'],
    }[result.reason] ?? [409, 'conflict', 'The change could not be applied'];
    throw new HttpError(refused[0], refused[1], refused[2]);
  }
  // Recorded as soon as the canonical change commits, so a later Auth failure is still visible in the log.
  await auditAccount(repo, caller, 'user.update', { uid: id }, { role, active, team }, { role: prior.role, active: prior.active, team: prior.team });

  // Claims are never cleared. Deactivation keeps the role and sets active:false.
  const claims = active
    ? { role, active: true, ...(team ? { team } : {}) }
    : { role, active: false };
  await auth.setCustomUserClaims(id, claims);
  // Revoke on deactivation, on any role change, and whenever an earlier Auth step failed. The last case matters:
  // a retry finds the role already changed in Firestore, so the comparison alone would skip the revoke.
  if (!active || role !== prior.role || prior.authSyncPending) await auth.revokeRefreshTokens(id);
  await auth.updateUser(id, { disabled: !active });
  await repo.updateUser(id, { authSyncPending: false });
  // A deactivated account must stop receiving pushes, so its device tokens go too.
  if (!active) for (const token of await repo.listDevices(id)) await repo.removeDevice(token);
  return { uid: id, role, active, team };
}

// Any signed-in account with no staff claims becomes a resident. A disabled account or
// one holding a non-resident role is refused, so self-heal can never re-enable it.
export async function registerSelf({ repo, auth }, identity, body) {
  const uid = identity.uid;
  let name;
  if (body?.name === undefined || body?.name === null) {
    const local = typeof identity.email === 'string' ? identity.email.split('@')[0] : '';
    name = sanitizeText(local, 100) || 'Resident';
  } else {
    name = cleanName(body.name);
  }
  let phone = null;
  if (body?.phone !== undefined && body?.phone !== null) {
    if (typeof body.phone !== 'string' || !PHONE_RE.test(body.phone.trim())) {
      throw new HttpError(400, 'invalid_phone', 'Phone number is not valid');
    }
    phone = body.phone.trim();
  }

  // The email comes from the verified Firebase token, never from the request body, so admins can find the account by it.
  const contact = typeof identity.email === 'string' && identity.email
    ? { email: identity.email, emailVerified: identity.emailVerified === true }
    : {};

  const existing = await repo.getUser(uid);
  if (existing) {
    if (existing.role === 'resident' && existing.active === true) {
      // Accounts made before this field existed get their verified email on the next sign-in.
      if (contact.email && existing.email !== contact.email) await repo.updateUser(uid, contact);
      await auth.setCustomUserClaims(uid, { role: 'resident', active: true });
      return { created: false, uid, role: 'resident' };
    }
    if (existing.active === false) throw new HttpError(409, 'account_disabled', 'This account is disabled');
    throw new HttpError(409, 'account_conflict', 'This account already has a different role');
  }

  await repo.createUser(uid, { name, phone, ...contact, role: 'resident', active: true, createdAt: new Date() });
  await auth.setCustomUserClaims(uid, { role: 'resident', active: true });
  return { created: true, uid, role: 'resident' };
}
