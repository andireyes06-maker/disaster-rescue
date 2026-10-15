// In-memory double for the parts of firebase-admin auth the API uses.
const coded = (code, msg) => Object.assign(new Error(msg), { code });

export function createFakeAuth() {
  const users = new Map(); // uid -> {uid, email, displayName, disabled, customClaims}
  const calls = { setCustomUserClaims: [], revokeRefreshTokens: [], deleteUser: [] };
  let n = 0;
  const get = (uid) => {
    const u = users.get(uid);
    if (!u) throw coded('auth/user-not-found', `No user ${uid}`);
    return u;
  };
  return {
    calls,
    users,
    async createUser({ email, displayName }) {
      if ([...users.values()].some((u) => u.email === email)) {
        throw coded('auth/email-already-exists', 'The email address is already in use');
      }
      const uid = `auth-${++n}`;
      users.set(uid, { uid, email, displayName, disabled: false, customClaims: undefined });
      return { uid };
    },
    async setCustomUserClaims(uid, claims) {
      calls.setCustomUserClaims.push({ uid, claims: structuredClone(claims) });
      get(uid).customClaims = structuredClone(claims);
    },
    async revokeRefreshTokens(uid) { calls.revokeRefreshTokens.push(uid); get(uid); },
    async updateUser(uid, patch) { const u = get(uid); if ('disabled' in patch) u.disabled = patch.disabled; },
    async deleteUser(uid) { calls.deleteUser.push(uid); users.delete(uid); },
  };
}
