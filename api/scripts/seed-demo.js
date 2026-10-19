#!/usr/bin/env node
// Seeds the synthetic demo workspace into the Firebase EMULATORS only.
// Usage (from api/):  npm run seed:demo            (writes the default scenario)
//                     npm run seed:demo -- --reset (removes demo-owned records first, then seeds)
// Run through `firebase emulators:exec`, which sets both emulator hosts. Never run against a live project.
import { pathToFileURL } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildScenario, buildQaScenario, ACCOUNTS, CONFIG_DEMO, DEFAULT_NOW, EXPECTED } from '../../demo-data/scenario.mjs';
import { buildPresentationScenario } from '../../demo-data/presentation.mjs';

const DEMO_PROJECT_RE = /^demo-/;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo-Sample#2026'; // Emulator only. Never a real password.
const BATCH_LIMIT = 400;

// Refuses anything that could reach a live project. Exported so tests can check the refusal rules.
export function assertEmulatorOnly(env, argv) {
  if (argv.includes('--real') || argv.some((a) => a.startsWith('--project'))) {
    return 'Refusing: this seed never targets a live project.';
  }
  if (!env.FIRESTORE_EMULATOR_HOST || !env.FIREBASE_AUTH_EMULATOR_HOST) {
    return 'Refusing: run through `firebase emulators:exec` so both FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST are set.';
  }
  const projectId = env.FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT || 'demo-disaster-rescue';
  if (!DEMO_PROJECT_RE.test(projectId)) {
    return `Refusing: project "${projectId}" is not a demo project (its ID must start with "demo-").`;
  }
  return null;
}

export function parseArgs(argv) {
  const nowIdx = argv.indexOf('--now');
  const scIdx = argv.indexOf('--scenario');
  const scenario = scIdx >= 0 ? argv[scIdx + 1] : 'default';
  return {
    reset: argv.includes('--reset'),
    scenario,
    now: nowIdx >= 0 ? argv[nowIdx + 1] : process.env.DEMO_NOW || DEFAULT_NOW,
  };
}

const isDemoId = (id) => id.startsWith('demo-');

async function commitInChunks(db, writes) {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { ref, data } of writes.slice(i, i + BATCH_LIMIT)) batch.set(ref, data);
    await batch.commit();
  }
}

async function resetDemo(db, auth) {
  const deletions = [];
  for (const name of ['reports', 'teams', 'users', 'notifications', 'auditLogs']) {
    const refs = await db.collection(name).select().get();
    for (const doc of refs.docs) if (isDemoId(doc.id)) deletions.push(doc.ref);
  }
  for (const ref of deletions) {
    if (ref.parent.id === 'reports') {
      const updates = await ref.collection('updates').select().get();
      updates.docs.forEach((u) => deletions.push(u.ref));
    }
  }
  deletions.push(db.collection('config').doc('demo'));
  for (let i = 0; i < deletions.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of deletions.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
  const listed = await auth.listUsers(1000);
  const uids = listed.users.map((u) => u.uid).filter(isDemoId);
  if (uids.length) await auth.deleteUsers(uids);
  return { documents: deletions.length, authUsers: uids.length };
}

// Removes demo-owned records that the chosen scenario no longer contains (for example, QA rows after a default run).
// Only IDs starting with demo- are considered. Every other document is left alone.
async function pruneStale(db, scenario) {
  const keep = {
    reports: new Set(scenario.reports.map((r) => r.id)),
    teams: new Set(scenario.teams.map((t) => t.id)),
    notifications: new Set(scenario.notifications.map((n) => n.id)),
    auditLogs: new Set(scenario.audit.map((a) => a.id)),
    updates: new Set(scenario.updates.map((u) => u.id)),
  };
  const stale = [];
  for (const name of ['reports', 'teams', 'notifications', 'auditLogs']) {
    const refs = await db.collection(name).select().get();
    for (const doc of refs.docs) if (isDemoId(doc.id) && !keep[name].has(doc.id)) stale.push(doc.ref);
  }
  const reports = await db.collection('reports').select().get();
  for (const doc of reports.docs) {
    if (!isDemoId(doc.id)) continue;
    const updates = await doc.ref.collection('updates').select().get();
    for (const u of updates.docs) if (!keep.updates.has(u.id)) stale.push(u.ref);
  }
  // Deleting a report does not remove its updates subcollection, so stale updates are listed and removed above.
  for (let i = 0; i < stale.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of stale.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
  return stale.length;
}

async function upsertAccount(auth, account) {
  const profile = { displayName: account.name, emailVerified: true };
  let existing = null;
  try {
    existing = await auth.getUser(account.uid);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  if (existing) {
    await auth.updateUser(account.uid, { ...profile, email: account.email });
  } else {
    await auth.createUser({ uid: account.uid, email: account.email, password: DEMO_PASSWORD, ...profile });
  }
  const claims = { role: account.role, active: true, ...(account.team ? { team: account.team } : {}) };
  await auth.setCustomUserClaims(account.uid, claims);
}

export async function seedDemo({ db, auth }, { now, reset, scenario: name = 'default' }) {
  if (!['default', 'qa', 'presentation'].includes(name)) throw new Error(`Unknown scenario "${name}". Use default, qa or presentation.`);
  if (name === 'presentation' && db.projectId !== 'demo-harbor-presentation') {
    throw new Error('Presentation content must use its isolated demo-harbor-presentation project.');
  }
  const scenario = name === 'qa' ? buildQaScenario({ now }) : name === 'presentation' ? buildPresentationScenario({ now }) : buildScenario({ now });
  const summary = { reset: null, scenario: name };
  if (reset) summary.reset = await resetDemo(db, auth);

  for (const account of ACCOUNTS) await upsertAccount(auth, account);
  summary.pruned = await pruneStale(db, scenario);

  const writes = [];
  for (const account of ACCOUNTS) {
    const profile = { name: account.name, email: account.email, role: account.role, phone: account.phone, active: true, createdAt: scenario.now };
    if (account.team) profile.team = account.team;
    writes.push({ ref: db.collection('users').doc(account.uid), data: profile });
  }
  for (const team of scenario.teams) writes.push({ ref: db.collection('teams').doc(team.id), data: team });
  for (const report of scenario.reports) {
    const { id, ...data } = report;
    writes.push({ ref: db.collection('reports').doc(id), data });
  }
  for (const update of scenario.updates) {
    const { id, reportId, ...data } = update;
    writes.push({ ref: db.collection('reports').doc(reportId).collection('updates').doc(id), data });
  }
  for (const entry of scenario.audit) {
    const { id, ...data } = entry;
    writes.push({ ref: db.collection('auditLogs').doc(id), data });
  }
  for (const note of scenario.notifications) {
    const { id, ...data } = note;
    writes.push({ ref: db.collection('notifications').doc(id), data });
  }
  writes.push({ ref: db.collection('config').doc('demo'), data: CONFIG_DEMO(now, name) });
  await commitInChunks(db, writes);

  // Read back what is stored, so the printed counts reflect the database rather than the input.
  const reports = await db.collection('reports').get();
  const stored = reports.docs.filter((d) => isDemoId(d.id));
  const teams = (await db.collection('teams').get()).docs.filter((d) => isDemoId(d.id));
  summary.stored = {
    reports: stored.length,
    teams: teams.length,
    busyTeams: teams.filter((t) => t.data().busy === true).length,
    accounts: ACCOUNTS.length,
  };
  summary.expected = { reports: EXPECTED.total, busyTeams: EXPECTED.busyTeams, teams: 12 };
  return summary;
}

async function main() {
  const refusal = assertEmulatorOnly(process.env, process.argv.slice(2));
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  const { reset, now, scenario } = parseArgs(process.argv.slice(2));
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-disaster-rescue';
  initializeApp({ projectId });
  const summary = await seedDemo({ db: getFirestore(), auth: getAuth() }, { now, reset, scenario });
  console.log(`Demo workspace seeded into emulator project ${projectId}. Scenario ${summary.scenario}, clock ${now}.`);
  if (summary.reset) console.log(`Reset removed ${summary.reset.documents} demo documents and ${summary.reset.authUsers} demo accounts.`);
  if (summary.scenario === 'default') {
    console.log(`Stored: ${summary.stored.reports} reports (expected ${summary.expected.reports}), ${summary.stored.teams} teams (expected ${summary.expected.teams}), ${summary.stored.busyTeams} busy teams (expected ${summary.expected.busyTeams}).`);
  } else {
    console.log(`Stored: ${summary.stored.reports} QA reports.`);
  }
  console.log(`Sign in with any demo account (password from DEMO_PASSWORD, default in this script): elena.cruz@harbor.example, marco.reyes@harbor.example, adrian.santos@harbor.example, maya.torres@harbor.example, daniel.flores@harbor.example`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
