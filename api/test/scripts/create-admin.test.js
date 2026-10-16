import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAdmin, parseArgs } from '../../scripts/create-admin.js';
import { createFakeAuth } from '../fakes/fakeAuth.js';
import { createFakeFirestore } from '../fakes/fakeFirestore.js';

const script = fileURLToPath(new URL('../../scripts/create-admin.js', import.meta.url));

describe('create-admin', () => {
  it('reads the email from --email and refuses a missing one', () => {
    expect(parseArgs(['--email', 'admin@example.com']).email).toBe('admin@example.com');
    expect(parseArgs([]).email).toBeUndefined();
  });

  it('exits 1 with usage when run without --email', () => {
    let status = 0;
    try { execFileSync(process.execPath, [script], { stdio: 'pipe' }); } catch (e) { status = e.status; }
    expect(status).toBe(1);
  });

  it('creates the Auth user with the admin claim and a users document', async () => {
    const auth = createFakeAuth();
    const db = createFakeFirestore();
    const { uid } = await createAdmin({ auth, db }, { email: 'admin@example.com', password: 'a-long-enough-password' });
    expect(auth.users.get(uid).customClaims).toEqual({ role: 'admin', active: true });
    const doc = await db.collection('users').doc(uid).get();
    expect(doc.data()).toMatchObject({ role: 'admin', email: 'admin@example.com', active: true });
  });

  it('refuses a second run with the same email', async () => {
    const auth = createFakeAuth();
    const db = createFakeFirestore();
    await createAdmin({ auth, db }, { email: 'admin@example.com', password: 'a-long-enough-password' });
    await expect(createAdmin({ auth, db }, { email: 'admin@example.com', password: 'a-long-enough-password' }))
      .rejects.toMatchObject({ code: 'auth/email-already-exists' });
  });
});
