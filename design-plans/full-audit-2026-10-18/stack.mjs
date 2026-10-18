import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire('/private/tmp/rescue-release-integration-2026-10-18/api/package.json');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
import { seedDemo } from '../../api/scripts/seed-demo.js';

export const PROJECT = 'demo-full-audit-2026-10-18';
const apiRoot = '/private/tmp/rescue-release-integration-2026-10-18/api/';
const webRoot = '/private/tmp/rescue-release-integration-2026-10-18/web/';

export function assertPresentationEnvironment(env) {
  if (env.FIREBASE_PROJECT_ID !== PROJECT || env.GCLOUD_PROJECT !== PROJECT
    || !['127.0.0.1:8690', 'localhost:8690'].includes(env.FIRESTORE_EMULATOR_HOST)
    || !['127.0.0.1:9799', 'localhost:9799'].includes(env.FIREBASE_AUTH_EMULATOR_HOST)) {
    throw new Error('Refusing: presentation requires its dedicated local emulator project and ports.');
  }
}

async function assertFree(port, host) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`Port ${port} is busy. Presentation will not reuse or stop an existing service.`)));
    server.listen(port, host, () => server.close(resolve));
  });
}

async function main() {
  // Never pass local service-account or upload credentials to this workspace.
  const env = { ...process.env, DEBUG: '', FIREBASE_PROJECT_ID: PROJECT, GCLOUD_PROJECT: PROJECT };
  for (const key of Object.keys(env)) {
    if (/GOOGLE_APPLICATION_CREDENTIALS|CLOUDINARY|^FIREBASE_CONFIG$/.test(key)) delete env[key];
  }
  const children = [];
  const inside = process.argv.includes('--inside');
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      try {
        if (!inside && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
        else child.kill('SIGTERM');
      } catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
    }
    process.exitCode = code;
  };
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  const run = (command, args, cwd, childEnv = env) => {
    const child = spawn(command, args, { cwd, env: childEnv, stdio: 'inherit', detached: !inside && process.platform !== 'win32' });
    children.push(child);
    child.on('error', (error) => { console.error(error.message); stop(1); });
    child.on('exit', (code, signal) => { if (!stopping) stop(code ?? (signal ? 1 : 0)); });
    return child;
  };
  if (!inside) {
    for (const port of [9799, 8690, 9187, 4437, 4537, 3108, 5181]) {
      await assertFree(port, '127.0.0.1');
      await assertFree(port, '::1');
    }
    delete env.FIRESTORE_EMULATOR_HOST;
    delete env.FIREBASE_AUTH_EMULATOR_HOST;
    run('firebase', ['emulators:exec', '--config', '/private/tmp/rescue-release-integration-2026-10-18/design-plans/full-audit-2026-10-18/firebase.json', '--only', 'auth,firestore', '--project', PROJECT, 'node /private/tmp/rescue-release-integration-2026-10-18/design-plans/full-audit-2026-10-18/stack.mjs --inside'], apiRoot);
    return;
  }
  assertPresentationEnvironment(env);
  initializeApp({ projectId: PROJECT });
  const db = getFirestore();
  const reports = await db.collection('reports').limit(1).get();
  if (!reports.empty) throw new Error('Refusing to overwrite a populated presentation workspace. Restart its dedicated emulators for a fresh session.');
  await seedDemo({ db, auth: getAuth() }, { now: new Date().toISOString(), reset: false, scenario: 'default' });
  await db.collection('config').doc('hotlines').set({
    numbers: [],
    residentNotice: 'If you are in immediate danger, call your local emergency number. Reporting here does not guarantee immediate rescue. Include your location and any hazards so staff can review your report.',
  });
  run(process.execPath, ['src/server.js'], apiRoot, { ...env, PORT: '3108', CORS_ORIGINS: 'http://localhost:5181' });
  run(process.execPath, ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5181', '--strictPort'], webRoot, {
    ...env,
    VITE_API_BASE_URL: 'http://localhost:3108/api',
    VITE_FIREBASE_API_KEY: 'harbor-local-key',
    VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: PROJECT,
    VITE_FIREBASE_APP_ID: 'harbor-presentation',
    VITE_USE_EMULATORS: 'true',
    VITE_AUTH_EMULATOR_PORT: '9799',
    VITE_FIRESTORE_EMULATOR_PORT: '8690',
  });
  console.log('Harbor presentation: http://localhost:5181 — isolated fictional content; QA workspace preserved.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
