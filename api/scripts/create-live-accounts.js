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

// Accounts to create. Edit names and emails before running. Teams must already exist on the live project.
export const LIVE_ACCOUNTS = [
  { email: 'elena.cruz@harbor.example', name: 'Elena Cruz', role: 'admin', team: null },
  { email: 'daniel.flores@harbor.example', name: 'Daniel Flores', role: 'responder', team: 'team-alpha' },
];

export function generatePassword() {
  return randomBytes(12).toString('base64url');
}

// Creates the Auth user, role and active claims, and the users document. Returns the uid.
export async function createLiveAccount({ auth, db }, { email, password, name, role, team }) {
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
