import assert from 'node:assert/strict';
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const here = dirname(fileURLToPath(import.meta.url));
let env;

const ctx = {
  anon: () => env.unauthenticatedContext().firestore(),
  resident: (uid = 'res1') => env.authenticatedContext(uid, { role: 'resident', active: true }).firestore(),
  resident2: () => env.authenticatedContext('res2', { role: 'resident', active: true }).firestore(),
  dispatcher: () => env.authenticatedContext('disp1', { role: 'dispatcher', active: true }).firestore(),
  dmo: () => env.authenticatedContext('dmo1', { role: 'dmo', active: true }).firestore(),
  responderA: () => env.authenticatedContext('resp1', { role: 'responder', active: true, team: 'team-alpha' }).firestore(),
  responderB: () => env.authenticatedContext('resp2', { role: 'responder', active: true, team: 'team-bravo' }).firestore(),
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-disaster-rescue',
    firestore: { rules: readFileSync(join(here, 'firestore.rules'), 'utf8') },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc('reports/r1').set({ reporterId: 'res1', assignedTeamId: 'team-alpha', status: 'assigned', type: 'flood' });
    await db.doc('reports/r2').set({ reporterId: 'res2', assignedTeamId: 'team-bravo', status: 'new', type: 'fire' });
    await db.doc('reports/r3').set({ reporterId: 'res2', assignedTeamId: null, status: 'new', type: 'flood' });
    await db.doc('reports/r4').set({ reporterId: 'res2', status: 'new', type: 'flood' });
    await db.doc('reports/r3/updates/u3').set({ status: 'new', byUid: 'res2' });
    await db.doc('reports/r1/updates/u1').set({ status: 'assigned', byUid: 'disp1' });
    await db.doc('reports/r2/updates/u2').set({ status: 'new', byUid: 'res2' });
    await db.doc('users/res1').set({ role: 'resident', name: 'R1' });
    await db.doc('users/res2').set({ role: 'resident', name: 'R2' });
    await db.doc('notifications/n1').set({ recipientUid: 'res1', title: 't' });
    await db.doc('notifications/n2').set({ recipientUid: 'res2', title: 't' });
    await db.doc('teams/team-alpha').set({ name: 'Team Alpha', members: ['resp1'], status: 'available' });
    await db.doc('auditLogs/a1').set({ actorUid: 'disp1', action: 'assign' });
    await db.doc('config/hotlines').set({ numbers: [{ label: '911', number: '911' }] });
    await db.doc('devices/tok1').set({ uid: 'res1' });
  });
});

describe('unauthenticated', () => {
  for (const p of ['reports/r1', 'reports/r1/updates/u1', 'users/res1', 'notifications/n1', 'teams/team-alpha', 'auditLogs/a1', 'config/hotlines', 'devices/tok1']) {
    test(`cannot read ${p}`, async () => { await assertFails(ctx.anon().doc(p).get()); });
  }
});

describe('reports', () => {
  test('resident reads own report', async () => { await assertSucceeds(ctx.resident().doc('reports/r1').get()); });
  test('resident cannot read another resident report', async () => { await assertFails(ctx.resident().doc('reports/r2').get()); });
  test('resident own-reports query succeeds', async () => {
    await assertSucceeds(ctx.resident().collection('reports').where('reporterId', '==', 'res1').get());
  });
  test('resident unfiltered list fails', async () => { await assertFails(ctx.resident().collection('reports').get()); });
  test('dispatcher reads all', async () => {
    await assertSucceeds(ctx.dispatcher().doc('reports/r1').get());
    await assertSucceeds(ctx.dispatcher().doc('reports/r2').get());
    await assertSucceeds(ctx.dispatcher().collection('reports').get());
  });
  test('dmo reads all', async () => {
    await assertSucceeds(ctx.dmo().doc('reports/r1').get());
    await assertSucceeds(ctx.dmo().doc('reports/r2').get());
  });
  test('responder reads only own team reports', async () => {
    await assertSucceeds(ctx.responderA().doc('reports/r1').get());
    await assertFails(ctx.responderA().doc('reports/r2').get());
    await assertFails(ctx.responderB().doc('reports/r1').get());
    await assertSucceeds(ctx.responderB().doc('reports/r2').get());
  });
  test('responder team query succeeds, unfiltered fails', async () => {
    await assertSucceeds(ctx.responderA().collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
    await assertFails(ctx.responderA().collection('reports').get());
  });
  test('responder without team claim reads nothing', async () => {
    const db = env.authenticatedContext('resp3', { role: 'responder', active: true }).firestore();
    await assertFails(db.doc('reports/r1').get());
  });
  describe('unassigned reports (null and missing assignedTeamId) are never readable by responders', () => {
    const variants = {
      'no team claim': { role: 'responder', active: true },
      'empty team claim': { role: 'responder', active: true, team: '' },
      'real team claim': { role: 'responder', active: true, team: 'team-alpha' },
    };
    for (const [name, claims] of Object.entries(variants)) {
      for (const id of ['r3', 'r4']) {
        test(`${name} cannot get reports/${id}`, async () => {
          await assertFails(env.authenticatedContext('resp9', claims).firestore().doc(`reports/${id}`).get());
        });
        test(`${name} cannot read updates of reports/${id}`, async () => {
          await assertFails(env.authenticatedContext('resp9', claims).firestore().doc(`reports/${id}/updates/u${id.slice(1)}`).get());
        });
      }
      test(`${name} cannot query assignedTeamId == null`, async () => {
        await assertFails(env.authenticatedContext('resp9', claims).firestore().collection('reports').where('assignedTeamId', '==', null).get());
      });
      test(`${name} cannot query assignedTeamId == ''`, async () => {
        await assertFails(env.authenticatedContext('resp9', claims).firestore().collection('reports').where('assignedTeamId', '==', '').get());
      });
    }
    test('proper team query returns only assigned reports', async () => {
      const db = env.authenticatedContext('resp9', variants['real team claim']).firestore();
      const snap = await assertSucceeds(db.collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
      assert.deepEqual(snap.docs.map((d) => d.id), ['r1']);
    });
  });
  test('no client can write reports', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('reports/new').set({ reporterId: 'res1' }));
      await assertFails(ctx[who]().doc('reports/r1').update({ status: 'resolved' }));
      await assertFails(ctx[who]().doc('reports/r1').delete());
    }
    await assertFails(ctx.anon().doc('reports/new').set({ a: 1 }));
  });
});

describe('report updates', () => {
  test('follow parent visibility', async () => {
    await assertSucceeds(ctx.resident().doc('reports/r1/updates/u1').get());
    await assertFails(ctx.resident().doc('reports/r2/updates/u2').get());
    await assertSucceeds(ctx.responderA().doc('reports/r1/updates/u1').get());
    await assertFails(ctx.responderA().doc('reports/r2/updates/u2').get());
    await assertSucceeds(ctx.dispatcher().doc('reports/r2/updates/u2').get());
    await assertSucceeds(ctx.dmo().doc('reports/r2/updates/u2').get());
  });
  test('inactive user cannot read updates', async () => {
    await assertFails(env.authenticatedContext('disp1', { role: 'dispatcher', active: false }).firestore().doc('reports/r1/updates/u1').get());
  });
  test('no client can write updates', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('reports/r1/updates/new').set({ note: 'x' }));
      await assertFails(ctx[who]().doc('reports/r1/updates/u1').delete());
    }
  });
});

describe('inactive or missing active claim', () => {
  const reads = ['reports/r1', 'reports/r1/updates/u1', 'users/res1', 'notifications/n1', 'teams/team-alpha', 'auditLogs/a1', 'config/hotlines'];
  for (const role of ['resident', 'dispatcher', 'dmo', 'responder']) {
    const extra = role === 'responder' ? { team: 'team-alpha' } : {};
    for (const p of reads) {
      test(`${role} with active=false cannot read ${p}`, async () => {
        const db = env.authenticatedContext('res1', { role, active: false, ...extra }).firestore();
        await assertFails(db.doc(p).get());
      });
      test(`${role} with MISSING active claim cannot read ${p}`, async () => {
        const db = env.authenticatedContext('res1', { role, ...extra }).firestore();
        await assertFails(db.doc(p).get());
      });
    }
  }
  test('active claim must be boolean true, not a string', async () => {
    const db = env.authenticatedContext('res1', { role: 'resident', active: 'true' }).firestore();
    await assertFails(db.doc('reports/r1').get());
  });
});

describe('users', () => {
  test('self reads own profile', async () => { await assertSucceeds(ctx.resident().doc('users/res1').get()); });
  test('resident cannot read other profile', async () => { await assertFails(ctx.resident().doc('users/res2').get()); });
  test('dispatcher reads any profile', async () => { await assertSucceeds(ctx.dispatcher().doc('users/res2').get()); });
  test('dmo and responder cannot read other profiles', async () => {
    await assertFails(ctx.dmo().doc('users/res2').get());
    await assertFails(ctx.responderA().doc('users/res2').get());
  });
  test('never writable, even by self or dispatcher', async () => {
    await assertFails(ctx.resident().doc('users/res1').update({ role: 'dispatcher' }));
    await assertFails(ctx.resident().doc('users/res1').set({ role: 'dispatcher' }));
    await assertFails(ctx.dispatcher().doc('users/res1').update({ active: false }));
    await assertFails(ctx.dispatcher().doc('users/new').set({ role: 'resident' }));
    await assertFails(ctx.dispatcher().doc('users/res1').delete());
  });
});

describe('notifications', () => {
  test('recipient reads own', async () => { await assertSucceeds(ctx.resident().doc('notifications/n1').get()); });
  test('cannot read another user notification', async () => {
    await assertFails(ctx.resident().doc('notifications/n2').get());
    await assertFails(ctx.dispatcher().doc('notifications/n1').get());
  });
  test('own query succeeds', async () => {
    await assertSucceeds(ctx.resident().collection('notifications').where('recipientUid', '==', 'res1').get());
  });
  test('no writes, including marking read', async () => {
    await assertFails(ctx.resident().doc('notifications/n1').update({ read: true }));
    await assertFails(ctx.resident().doc('notifications/new').set({ recipientUid: 'res1' }));
    await assertFails(ctx.resident().doc('notifications/n1').delete());
  });
});

describe('auditLogs', () => {
  test('dispatcher and dmo read', async () => {
    await assertSucceeds(ctx.dispatcher().doc('auditLogs/a1').get());
    await assertSucceeds(ctx.dmo().doc('auditLogs/a1').get());
  });
  test('resident and responder cannot read', async () => {
    await assertFails(ctx.resident().doc('auditLogs/a1').get());
    await assertFails(ctx.responderA().doc('auditLogs/a1').get());
  });
  test('no client can write', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('auditLogs/new').set({ action: 'x' }));
      await assertFails(ctx[who]().doc('auditLogs/a1').update({ action: 'x' }));
      await assertFails(ctx[who]().doc('auditLogs/a1').delete());
    }
  });
});

describe('teams', () => {
  test('dispatcher, dmo, responder read', async () => {
    await assertSucceeds(ctx.dispatcher().doc('teams/team-alpha').get());
    await assertSucceeds(ctx.dmo().doc('teams/team-alpha').get());
    await assertSucceeds(ctx.responderA().doc('teams/team-alpha').get());
  });
  test('resident cannot read', async () => { await assertFails(ctx.resident().doc('teams/team-alpha').get()); });
  test('no client can write', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('teams/team-alpha').update({ status: 'busy' }));
      await assertFails(ctx[who]().doc('teams/new').set({ name: 'x' }));
    }
  });
});

describe('config', () => {
  test('any active signed-in user reads hotlines', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertSucceeds(ctx[who]().doc('config/hotlines').get());
    }
  });
  test('no client can write', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('config/hotlines').set({ numbers: [] }));
      await assertFails(ctx[who]().doc('config/hotlines').update({ numbers: [] }));
    }
  });
  test('other config docs are not readable', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await c.firestore().doc('config/secret').set({ a: 1 }); });
    await assertFails(ctx.dispatcher().doc('config/secret').get());
  });
});

describe('devices', () => {
  test('no client access at all', async () => {
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertFails(ctx[who]().doc('devices/tok1').get());
      await assertFails(ctx[who]().doc('devices/tok2').set({ uid: 'x' }));
      await assertFails(ctx[who]().doc('devices/tok1').delete());
    }
  });
});

describe('default deny', () => {
  test('unknown collections denied', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await c.firestore().doc('misc/m1').set({ a: 1 }); });
    await assertFails(ctx.dispatcher().doc('misc/m1').get());
    await assertFails(ctx.dispatcher().doc('misc/m2').set({ a: 1 }));
  });
});
