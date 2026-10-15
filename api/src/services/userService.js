import { HttpError } from '../errors.js';
import { PHONE_RE, sanitizeText } from '../domain/validation.js';

const STAFF_ROLES = ['resident', 'responder', 'dispatcher', 'dmo'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const badName = () => new HttpError(400, 'invalid_name', 'Name must be 1 to 100 characters');
// Reject over-long names rather than truncating them: sanitizeText alone would cut to 100.
const cleanName = (v) => {
  const n = typeof v === 'string' ? sanitizeText(v, 10000) : '';
  if (!n || n.length > 100) throw badName();
  return n;
};

// Dispatcher creates staff. Dispatchers may never create admins.
export async function createStaff({ repo, auth }, body) {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email', 'A valid email is required');
  const name = cleanName(body?.name);
  const role = body?.role;
  if (role === 'admin') throw new HttpError(400, 'role_not_allowed', 'Dispatchers cannot create admins');
  if (!STAFF_ROLES.includes(role)) throw new HttpError(400, 'invalid_role', 'Unknown role');
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
  return { uid, role, team };
}

export async function updateStaff({ repo, auth }, id, body, callerUid) {
  const user = await repo.getUser(id);
  if (!user) throw new HttpError(404, 'not_found', 'User not found');
  // Dispatchers cannot touch admins or their own account, so they cannot lock out or demote an admin.
  if (user.role === 'admin') throw new HttpError(403, 'forbidden', 'Dispatchers cannot modify admins');
  if (id === callerUid) throw new HttpError(403, 'forbidden', 'You cannot change your own account');
  const hasRole = body?.role !== undefined;
  const hasActive = body?.active !== undefined;
  if (!hasRole && !hasActive) throw new HttpError(400, 'nothing_to_update', 'Send role and/or active');
  if (hasRole && body.role === 'admin') throw new HttpError(400, 'role_not_allowed', 'Dispatchers cannot assign admins');
  if (hasRole && !STAFF_ROLES.includes(body.role)) throw new HttpError(400, 'invalid_role', 'Unknown role');
  if (hasActive && typeof body.active !== 'boolean') throw new HttpError(400, 'invalid_active', 'active must be true or false');

  const role = hasRole ? body.role : user.role;
  const active = hasActive ? body.active : user.active === true;
  const patch = { role, active };

  // Claims are never cleared. Deactivation keeps the role and sets active:false.
  const claims = active
    ? { role, active: true, ...(user.team ? { team: user.team } : {}) }
    : { role, active: false };
  await auth.setCustomUserClaims(id, claims);
  if (!active) await auth.revokeRefreshTokens(id);
  await auth.updateUser(id, { disabled: !active });
  await repo.updateUser(id, patch);
  return { uid: id, role, active };
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

  const existing = await repo.getUser(uid);
  if (existing) {
    if (existing.role === 'resident' && existing.active === true) {
      await auth.setCustomUserClaims(uid, { role: 'resident', active: true });
      return { created: false, uid, role: 'resident' };
    }
    if (existing.active === false) throw new HttpError(409, 'account_disabled', 'This account is disabled');
    throw new HttpError(409, 'account_conflict', 'This account already has a different role');
  }

  await repo.createUser(uid, { name, phone, role: 'resident', active: true, createdAt: new Date() });
  await auth.setCustomUserClaims(uid, { role: 'resident', active: true });
  return { created: true, uid, role: 'resident' };
}
