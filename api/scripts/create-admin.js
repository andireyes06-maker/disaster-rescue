#!/usr/bin/env node
// One-time setup: create the first admin account. Run from a terminal, never from the app.
// Usage: node scripts/create-admin.js --email admin@example.com [--confirm-live]
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig } from '../src/config.js';

const MIN_PASSWORD = 12;

export function parseArgs(argv) {
  const i = argv.indexOf('--email');
  return { email: i >= 0 ? argv[i + 1] : undefined, confirmLive: argv.includes('--confirm-live') };
}

// Creates the Auth user, the admin claim, and the users document. Throws the Auth error unchanged (for example, a duplicate email).
export async function createAdmin({ auth, db }, { email, password, name = 'Administrator' }) {
  const { uid } = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  await auth.setCustomUserClaims(uid, { role: 'admin', active: true });
  await db.collection('users').doc(uid).set({ name, email, role: 'admin', team: null, active: true, createdAt: new Date() });
  return { uid };
}

// Reads a password without echoing it.
function readHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = () => {};
    process.stdout.write(prompt);
    rl.question('', (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function main() {
  const { email, confirmLive } = parseArgs(process.argv.slice(2));
  if (!email) {
    console.error('Usage: node scripts/create-admin.js --email <email> [--confirm-live]');
    process.exit(1);
  }
  // Refuse to touch the live project unless the operator says so on the command line.
  if (!process.env.FIRESTORE_EMULATOR_HOST && !confirmLive) {
    console.error('Refusing: no emulator is configured. Add --confirm-live to create an admin on the real project.');
    process.exit(1);
  }
  const password = await readHidden('Password for the new admin (12+ characters): ');
  if (password.length < MIN_PASSWORD) {
    console.error(`Refusing: the password must be at least ${MIN_PASSWORD} characters.`);
    process.exit(1);
  }
  const config = loadConfig();
  initializeApp({
    ...(config.serviceAccountPath ? { credential: cert(JSON.parse(readFileSync(config.serviceAccountPath, 'utf8'))) } : {}),
    ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
  });
  try {
    const { uid } = await createAdmin({ auth: getAuth(), db: getFirestore() }, { email: email.trim(), password });
    console.log(`Admin created: ${email} (uid ${uid}). Sign in on the web app with this email.`);
  } catch (e) {
    console.error(e.code === 'auth/email-already-exists' ? 'Refusing: that email already has an account.' : `Failed: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
