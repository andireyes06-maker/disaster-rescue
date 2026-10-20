// Runs only inside `firebase emulators:exec` (see `npm run test:demo-emulator`). Skipped otherwise.
import { describe, expect, it } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { seedDemo } from '../scripts/seed-demo.js';
import { DEFAULT_NOW, EXPECTED, ACCOUNTS } from '../../demo-data/scenario.mjs';

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);

async function snapshot(db, auth) {
  const reports = (await db.collection('reports').select().get()).docs.filter((d) => d.id.startsWith('demo-'));
  const updates = await Promise.all(reports.map((r) => r.ref.collection('updates').select().get()));
  const notes = (await db.collection('notifications').select().get()).docs.filter((d) => d.id.startsWith('demo-'));
  const audit = (await db.collection('auditLogs').select().get()).docs.filter((d) => d.id.startsWith('demo-'));
  const teams = (await db.collection('teams').get()).docs.filter((d) => d.id.startsWith('demo-'));
  const users = (await auth.listUsers(1000)).users.filter((u) => u.uid.startsWith('demo-'));
  return {
    reports: reports.length,
    updates: updates.reduce((n, s) => n + s.size, 0),
    notifications: notes.length,
    audit: audit.length,
    teams: teams.length,
    busyTeams: teams.filter((t) => t.data().busy === true).length,
    authUsers: users.length,
    ids: reports.map((r) => r.id).sort(),
  };
}

describe.skipIf(!emulator)('demo seed against the emulator', () => {
  it('is idempotent and resets only demo-owned records', async () => {
    if (!getApps().length) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-disaster-rescue' });
    const db = getFirestore();
    const auth = getAuth();
    const ctx = { db, auth };

    // A non-demo record that must survive every run, including --reset.
    await db.collection('reports').doc('live-probe-keep').set({ reference: 'DR-LIVEKEEP', status: 'Submitted', type: 'other', priority: 'low', verified: false, location: { lat: 1, lng: 1, source: 'manual' }, reporterId: 'not-demo', createdAt: new Date(DEFAULT_NOW) });

    await seedDemo(ctx, { now: DEFAULT_NOW, reset: false });
    const first = await snapshot(db, auth);
    await seedDemo(ctx, { now: DEFAULT_NOW, reset: false });
    const second = await snapshot(db, auth);
    expect(second).toEqual(first);

    expect(first.reports).toBe(EXPECTED.total);
    expect(first.teams).toBe(12);
    expect(first.busyTeams).toBe(EXPECTED.busyTeams);
    expect(first.authUsers).toBe(ACCOUNTS.length);
    expect(first.updates).toBeGreaterThan(0);
    expect(first.notifications).toBeGreaterThan(0);
    expect(first.audit).toBeGreaterThan(0);

    await seedDemo(ctx, { now: DEFAULT_NOW, reset: true });
    const afterReset = await snapshot(db, auth);
    expect(afterReset).toEqual(first);

    // The QA set replaces the default set, and a later default run restores it exactly with no QA rows left behind.
    await seedDemo(ctx, { now: DEFAULT_NOW, reset: false, scenario: 'qa' });
    const qa = await snapshot(db, auth);
    expect(qa.reports).toBe(3);
    await seedDemo(ctx, { now: DEFAULT_NOW, reset: false });
    expect(await snapshot(db, auth)).toEqual(first);

    const keep = await db.collection('reports').doc('live-probe-keep').get();
    expect(keep.exists).toBe(true);
    await db.collection('reports').doc('live-probe-keep').delete();
  }, 120000);
});
