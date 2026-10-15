// Seeds test accounts, a team, and hotlines.
// Emulators: set FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST (emulators:exec does this).
// Real project: set GOOGLE_APPLICATION_CREDENTIALS and pass --real.
import admin from 'firebase-admin';

const EMULATOR_TEST_PASSWORD = 'TestOnly-Rescue#2026'; // emulator only, never reuse
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
const real = process.argv.includes('--real');
const emulator = Boolean(authHost && fsHost);

if (real && (authHost || fsHost)) {
  console.error('Refusing: an emulator host is set and --real was passed. Unset FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST.');
  process.exit(1);
}
if (!real && Boolean(authHost) !== Boolean(fsHost)) {
  console.error('Refusing: set BOTH FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST (or neither).');
  process.exit(1);
}
if (!emulator && !(real && process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('Refusing to run. Use emulator hosts (FIREBASE_AUTH_EMULATOR_HOST + FIRESTORE_EMULATOR_HOST),\nor set GOOGLE_APPLICATION_CREDENTIALS and pass --real.');
  process.exit(1);
}
if (real && !process.env.SEED_PASSWORD) {
  console.error('Refusing: --real requires the SEED_PASSWORD env var (no default password for a real project).');
  process.exit(1);
}
const PASSWORD = real ? process.env.SEED_PASSWORD : EMULATOR_TEST_PASSWORD;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || (emulator ? 'demo-disaster-rescue' : undefined);
admin.initializeApp(emulator ? { projectId } : { credential: admin.credential.applicationDefault(), projectId });
const auth = admin.auth();
const db = admin.firestore();

const ACCOUNTS = [
  { key: 'resident', email: 'resident@test.dev', name: 'Test Resident', role: 'resident', phone: '09170000001' },
  { key: 'dispatcher', email: 'dispatcher@test.dev', name: 'Test Dispatcher', role: 'dispatcher', phone: '09170000002' },
  { key: 'responder', email: 'responder@test.dev', name: 'Test Responder', role: 'responder', phone: '09170000003', team: 'team-alpha' },
  { key: 'dmo', email: 'dmo@test.dev', name: 'Test DMO', role: 'dmo', phone: '09170000004' },
];

async function upsertUser(a) {
  // Existing users keep their password. Only brand new users get PASSWORD.
  let user;
  try {
    user = await auth.getUserByEmail(a.email);
    user = await auth.updateUser(user.uid, { displayName: a.name, emailVerified: true });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: a.email, password: PASSWORD, displayName: a.name, emailVerified: true });
  }
  const claims = { role: a.role, active: true, ...(a.team ? { team: a.team } : {}) };
  await auth.setCustomUserClaims(user.uid, claims);
  const profile = { name: a.name, role: a.role, phone: a.phone, active: true };
  if (a.team) profile.team = a.team;
  const ref = db.collection('users').doc(user.uid);
  if ((await ref.get()).exists) await ref.set(profile, { merge: true }); // keep createdAt
  else await ref.set({ ...profile, createdAt: new Date() });
  return { uid: user.uid, claims };
}

const uids = {};
for (const a of ACCOUNTS) {
  const { uid, claims } = await upsertUser(a);
  uids[a.key] = uid;
  console.log(`user ${a.email} uid=${uid} claims=${JSON.stringify(claims)}`);
}

await db.collection('teams').doc('team-alpha').set({ name: 'Team Alpha', members: [uids.responder], status: 'available' });
console.log('team teams/team-alpha members=[' + uids.responder + ']');

// Editable by a dispatcher through the API. The LDRRMO number is a placeholder.
await db.collection('config').doc('hotlines').set({
  numbers: [
    { label: 'National Emergency Hotline', number: '911', editable: false },
    { label: 'LDRRMO (placeholder, replace with your local number)', number: '000-0000', editable: true },
  ],
});
console.log('config/hotlines written');
console.log(`Seed complete (${emulator ? 'emulator' : 'REAL project ' + projectId}).`);
process.exit(0);
