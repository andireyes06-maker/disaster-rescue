// In-memory double for the parts of firebase-admin auth the API uses.
const coded = (code, msg) => Object.assign(new Error(msg), { code });

export function createFakeAuth() {
  const users = new Map(); // uid -> {uid, email, displayName, disabled, customClaims}
  const calls = { setCustomUserClaims: [], revokeRefreshTokens: [], deleteUser: [] };
  let n = 0;
  // Tests set failOnce.<method> = true to make the next call throw, simulating a partial failure.
  const failOnce = {};
  const maybeFail = (name) => { if (failOnce[name]) { failOnce[name] = false; throw coded('auth/internal-error', `injected ${name} failure`); } };
  const get = (uid) => {
    const u = users.get(uid);
    if (!u) throw coded('auth/user-not-found', `No user ${uid}`);
    return u;
  };
  return {
    calls,
    users,
    failOnce,
    async createUser({ email, displayName }) {
      if ([...users.values()].some((u) => u.email === email)) {
        throw coded('auth/email-already-exists', 'The email address is already in use');
      }
      const uid = `auth-${++n}`;
      users.set(uid, { uid, email, displayName, disabled: false, customClaims: undefined });
      return { uid };
    },
    async setCustomUserClaims(uid, claims) {
      maybeFail('setCustomUserClaims');
      calls.setCustomUserClaims.push({ uid, claims: structuredClone(claims) });
      get(uid).customClaims = structuredClone(claims);
    },
    async revokeRefreshTokens(uid) { maybeFail('revokeRefreshTokens'); calls.revokeRefreshTokens.push(uid); get(uid); },
    async updateUser(uid, patch) { maybeFail('updateUser'); const u = get(uid); if ('disabled' in patch) u.disabled = patch.disabled; if ('password' in patch) u.passwordSet = true; },
    async getUserByEmail(email) {
      const u = [...users.values()].find((x) => x.email === email);
      if (!u) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
      return u;
    },
    async deleteUser(uid) { calls.deleteUser.push(uid); users.delete(uid); },
  };
}
