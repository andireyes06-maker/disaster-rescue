#!/usr/bin/env node
// One-time setup: create the live administrator and rescuer accounts on the real Firebase project.
// Run from a terminal with a service account, never from the app. Passwords are generated here and
// written to a private file outside the repository. They are never printed or committed.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node scripts/create-live-accounts.js --confirm-live --out /path/outside/repo/live-logins.txt
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig } from '../src/config.js';

// Accounts to create. Accounts that already exist are skipped. Missing responder teams are created.
export const LIVE_ACCOUNTS = [
  { email: 'elena.cruz@harbor.example', name: 'Elena Cruz', role: 'admin', team: null },
  { email: 'daniel.flores@harbor.example', name: 'Daniel Flores', role: 'responder', team: 'team-alpha' },
  { email: 'clara.navarro@harbor.example', name: 'Clara Navarro', role: 'responder', team: 'team-bravo' },
  { email: 'rafael.castillo@harbor.example', name: 'Rafael Castillo', role: 'responder', team: 'team-delta' },
  { email: 'nina.bautista@harbor.example', name: 'Nina Bautista', role: 'responder', team: 'team-foxtrot' },
  { email: 'maya.torres@harbor.example', name: 'Maya Torres', role: 'resident', team: null },
  { email: 'noah.garcia@harbor.example', name: 'Noah Garcia', role: 'resident', team: null },
  { email: 'isabel.ramos@harbor.example', name: 'Isabel Ramos', role: 'resident', team: null },
  { email: 'leo.mendoza@harbor.example', name: 'Leo Mendoza', role: 'resident', team: null },
];

export function generatePassword() {
  return randomBytes(12).toString('base64url');
}

// Creates a responder team document when it does not exist yet. Existing teams are left untouched.
export async function ensureTeam(db, team) {
  const ref = db.collection('teams').doc(team);
  const snap = await ref.get();
  if (snap.exists) return false;
  const name = team.replace(/^team-/, '').replace(/^./, (c) => c.toUpperCase());
  await ref.set({ name: `Team ${name}`, members: [], status: 'available', currentReportId: null, busy: false });
  return true;
}

// Creates the Auth user, role and active claims, and the users document. Returns the uid.
export async function createLiveAccount({ auth, db }, { email, password, name, role, team }) {
  if (team) await ensureTeam(db, team);
  const { uid } = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  const claims = { role, active: true, ...(team ? { team } : {}) };
  await auth.setCustomUserClaims(uid, claims);
  await db.collection('users').doc(uid).set({ name, email, role, team, active: true, createdAt: new Date() });
  return { uid };
}

export function parseArgs(argv) {
  const i = argv.indexOf('--out');
  return { out: i >= 0 ? argv[i + 1] : undefined, confirmLive: argv.includes('--confirm-live') };
}

async function main() {
  const { out, confirmLive } = parseArgs(process.argv.slice(2));
  if (!confirmLive || !out) {
    console.error('Usage: node scripts/create-live-accounts.js --confirm-live --out <file outside the repository>');
    process.exit(1);
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('Refusing: an emulator is configured. This script only writes to the live project.');
    process.exit(1);
  }
  const config = loadConfig();
  initializeApp({
    ...(config.serviceAccountPath ? { credential: cert(JSON.parse(readFileSync(config.serviceAccountPath, 'utf8'))) } : {}),
    ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
  });
  const auth = getAuth();
  const db = getFirestore();
  const lines = [];
  for (const account of LIVE_ACCOUNTS) {
    try {
      await auth.getUserByEmail(account.email);
      console.log(`Skipped, already exists: ${account.email}`);
      continue;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    const password = generatePassword();
    const { uid } = await createLiveAccount({ auth, db }, { ...account, password });
    lines.push(`${account.role}\t${account.email}\t${password}\t(uid ${uid})`);
    console.log(`Created ${account.role}: ${account.email}`);
  }
  writeFileSync(out, `Live logins, created ${new Date().toISOString()}\n${lines.join('\n')}\n`, { mode: 0o600 });
  console.log(`Passwords written to ${out}. Share them privately, then delete the file.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
