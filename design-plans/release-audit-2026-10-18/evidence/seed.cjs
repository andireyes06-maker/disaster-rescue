// Seeds the isolated release-audit emulator project only. Refuses anything that is not the emulator.
const { createRequire } = require('node:module');
const req = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/api/package.json');
const { initializeApp } = req('firebase-admin/app');
const { getAuth } = req('firebase-admin/auth');
const { getFirestore } = req('firebase-admin/firestore');

const PROJECT = 'demo-release-audit';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Refusing: emulator hosts are not set to the release-audit ports.');
}
initializeApp({ projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();
const PASSWORD = 'AuditOnly-Rescue-2026';

const ACCOUNTS = [
  { key: 'resident', email: 'resident@harbor.example', name: 'Maria Santos', role: 'resident', phone: '09170000001' },
  { key: 'dispatcher', email: 'dispatcher@harbor.example', name: 'Jose Reyes', role: 'dispatcher' },
  { key: 'responder', email: 'responder@harbor.example', name: 'Ana Cruz', role: 'responder', team: 'team-alpha' },
  { key: 'dmo', email: 'dmo@harbor.example', name: 'Miguel Tan', role: 'dmo' },
  { key: 'admin', email: 'admin@harbor.example', name: 'Rhea Lim', role: 'admin' },
];

async function main() {
  await db.collection('teams').doc('team-alpha').set({ name: 'Team Alpha', busy: false, currentReportId: null, createdAt: new Date() });
  await db.collection('teams').doc('team-bravo').set({ name: 'Team Bravo', busy: false, currentReportId: null, createdAt: new Date() });
  await db.collection('config').doc('hotlines').set({ numbers: [], residentNotice: 'Audit fixture notice. Reporting here does not guarantee immediate rescue.' });
  const uids = {};
  for (const a of ACCOUNTS) {
    let user;
    try { user = await auth.getUserByEmail(a.email); } catch { user = await auth.createUser({ email: a.email, password: PASSWORD, displayName: a.name, emailVerified: true }); }
    uids[a.key] = user.uid;
    const claims = { role: a.role, active: true, ...(a.team ? { team: a.team } : {}) };
    await auth.setCustomUserClaims(user.uid, claims);
    await db.collection('users').doc(user.uid).set({ name: a.name, email: a.email, role: a.role, active: true, phone: a.phone ?? null, team: a.team ?? null, createdAt: new Date() });
  }
  const now = new Date();
  const seeds = [
    { ref: 'DR-AUD0001', type: 'flood', description: 'Water rising near the market road', status: 'Submitted', lat: 14.5995, lng: 120.9842 },
    { ref: 'DR-AUD0002', type: 'fire', description: 'Smoke from a rooftop', status: 'Submitted', lat: 14.6042, lng: 120.9822 },
    { ref: 'DR-AUD0003', type: 'landslide', description: 'Soil moving behind the school gate wall', status: 'Verified', lat: 14.6100, lng: 120.9900, verified: true, priority: 'high' },
  ];
  for (const s of seeds) {
    await db.collection('reports').add({
      reference: s.ref, type: s.type, description: s.description, status: s.status, verified: Boolean(s.verified), priority: s.priority ?? 'medium',
      location: { lat: s.lat, lng: s.lng, source: 'gps' }, coarseLocation: { lat: s.lat, lng: s.lng }, reporterId: uids.resident, photos: [], createdAt: now, updatedAt: now,
    });
  }
  console.log(JSON.stringify({ project: PROJECT, uids }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
