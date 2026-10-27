import assert from 'node:assert/strict';
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const here = dirname(fileURLToPath(import.meta.url));
let env;

// The users/{uid} document is the authority the rules read. setUser writes it with the same role,
// active, and team as the token claims unless a test deliberately makes them disagree.
async function setUser(uid, { role, active, team, name = uid }) {
  await env.withSecurityRulesDisabled(async (c) => {
    const data = { role, active, name };
    if (team !== undefined) data.team = team;
    await c.firestore().doc(`users/${uid}`).set(data);
  });
}

// Seeds a matching user document, then returns a client authenticated with the given claims.
async function as(uid, claims) {
  const { role, active, team } = claims;
  await setUser(uid, { role, active: active === true, ...(team !== undefined ? { team } : {}) });
  return env.authenticatedContext(uid, claims).firestore();
}

// Standard actors are seeded in beforeEach, so these factories stay synchronous.
const ctx = {
  anon: () => env.unauthenticatedContext().firestore(),
  resident: (uid = 'res1') => env.authenticatedContext(uid, { role: 'resident', active: true }).firestore(),
  resident2: () => env.authenticatedContext('res2', { role: 'resident', active: true }).firestore(),
  dispatcher: () => env.authenticatedContext('disp1', { role: 'dispatcher', active: true }).firestore(),
  dmo: () => env.authenticatedContext('dmo1', { role: 'dmo', active: true }).firestore(),
  admin: () => env.authenticatedContext('adm1', { role: 'admin', active: true }).firestore(),
  responderA: () => env.authenticatedContext('resp1', { role: 'responder', active: true, team: 'team-alpha' }).firestore(),
  responderB: () => env.authenticatedContext('resp2', { role: 'responder', active: true, team: 'team-bravo' }).firestore(),
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-unit',
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
    await db.doc('reports/r5').set({ reporterId: 'res2', assignedTeamId: 'team-alpha', assignedTeamIds: ['team-alpha', 'team-bravo'], status: 'assigned', type: 'flood' });
    await db.doc('reports/r4').set({ reporterId: 'res2', status: 'new', type: 'flood' });
    await db.doc('reports/r3/updates/u3').set({ status: 'new', byUid: 'res2' });
    await db.doc('reports/r1/updates/u1').set({ status: 'assigned', byUid: 'disp1' });
    await db.doc('reports/r2/updates/u2').set({ status: 'new', byUid: 'res2' });
    await db.doc('users/res1').set({ role: 'resident', name: 'R1', active: true });
    await db.doc('users/res2').set({ role: 'resident', name: 'R2', active: true });
    await db.doc('users/disp1').set({ role: 'dispatcher', name: 'D1', active: true });
    await db.doc('users/dmo1').set({ role: 'dmo', name: 'M1', active: true });
    await db.doc('users/adm1').set({ role: 'admin', name: 'A1', active: true });
    await db.doc('users/resp1').set({ role: 'responder', name: 'P1', active: true, team: 'team-alpha' });
    await db.doc('users/resp2').set({ role: 'responder', name: 'P2', active: true, team: 'team-bravo' });
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
  // Professor clarification (2026-10-23): the website and staff reads are for administrators only.
  test('administrator reads all', async () => {
    await assertSucceeds(ctx.admin().doc('reports/r1').get());
    await assertSucceeds(ctx.admin().doc('reports/r2').get());
    await assertSucceeds(ctx.admin().collection('reports').get());
  });
  test('dispatcher and dmo cannot read reports', async () => {
    await assertFails(ctx.dispatcher().doc('reports/r1').get());
    await assertFails(ctx.dispatcher().collection('reports').get());
    await assertFails(ctx.dmo().doc('reports/r2').get());
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
  test('a report assigned to several teams is readable by each of them', async () => {
    await assertSucceeds(ctx.responderA().doc('reports/r5').get());
    await assertSucceeds(ctx.responderB().doc('reports/r5').get());
    await assertSucceeds(ctx.responderB().collection('reports').where('assignedTeamIds', 'array-contains', 'team-bravo').get());
  });
  test('responder without team claim reads nothing', async () => {
    const db = await as('resp3', { role: 'responder', active: true });
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
          await assertFails((await as('resp9', claims)).doc(`reports/${id}`).get());
        });
        test(`${name} cannot read updates of reports/${id}`, async () => {
          await assertFails((await as('resp9', claims)).doc(`reports/${id}/updates/u${id.slice(1)}`).get());
        });
      }
      test(`${name} cannot query assignedTeamId == null`, async () => {
        await assertFails((await as('resp9', claims)).collection('reports').where('assignedTeamId', '==', null).get());
      });
      test(`${name} cannot query assignedTeamId == ''`, async () => {
        await assertFails((await as('resp9', claims)).collection('reports').where('assignedTeamId', '==', '').get());
      });
    }
    test('proper team query returns only assigned reports', async () => {
      const db = await as('resp9', variants['real team claim']);
      const snap = await assertSucceeds(db.collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
      assert.deepEqual(snap.docs.map((d) => d.id), ['r1', 'r5']);
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
    await assertSucceeds(ctx.admin().doc('reports/r2/updates/u2').get());
    await assertFails(ctx.dispatcher().doc('reports/r2/updates/u2').get());
    await assertFails(ctx.dmo().doc('reports/r2/updates/u2').get());
  });
  test('inactive user cannot read updates', async () => {
    await assertFails((await as('disp1', { role: 'dispatcher', active: false })).doc('reports/r1/updates/u1').get());
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
        const db = await as('res1', { role, active: false, ...extra });
        await assertFails(db.doc(p).get());
      });
      // The document is active here, so only the token decides. This isolates the claim check.
      test(`${role} with MISSING active claim cannot read ${p}`, async () => {
        await setUser('res1', { role, active: true, ...extra });
        const db = env.authenticatedContext('res1', { role, ...extra }).firestore();
        await assertFails(db.doc(p).get());
      });
    }
  }
  test('active claim must be boolean true, not a string', async () => {
    await setUser('res1', { role: 'resident', active: true });
    const db = env.authenticatedContext('res1', { role: 'resident', active: 'true' }).firestore();
    await assertFails(db.doc('reports/r1').get());
  });
});

describe('stale or disagreeing claims (canonical users document wins)', () => {
  test('a demoted dispatcher with an old dispatcher token cannot read other residents', async () => {
    const stale = await as('disp1', { role: 'dispatcher', active: true });
    await setUser('disp1', { role: 'resident', active: true });
    await assertFails(stale.doc('reports/r2').get());
    await assertFails(stale.doc('users/res2').get());
    await assertFails(stale.collection('reports').get());
  });

  test('a disabled staff member with a still-valid token is refused everywhere', async () => {
    const stale = await as('disp1', { role: 'dispatcher', active: true });
    await setUser('disp1', { role: 'dispatcher', active: false });
    await assertFails(stale.doc('reports/r2').get());
    await assertFails(stale.doc('auditLogs/a1').get());
    await assertFails(stale.doc('teams/team-alpha').get());
  });

  test('a deleted or missing users document reads nothing even with matching claims', async () => {
    const db = env.authenticatedContext('ghost1', { role: 'dispatcher', active: true }).firestore();
    await assertFails(db.doc('reports/r2').get());
    await assertFails(db.doc('auditLogs/a1').get());
  });

  test('a responder moved to another team loses the old team reports at once', async () => {
    const moved = await as('resp1', { role: 'responder', active: true, team: 'team-alpha' });
    await assertSucceeds(moved.doc('reports/r1').get());
    await setUser('resp1', { role: 'responder', active: true, team: 'team-bravo' });
    await assertFails(moved.doc('reports/r1').get());
    await assertFails(moved.collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
  });

  test('a responder whose token team disagrees with the document reads nothing', async () => {
    await setUser('resp1', { role: 'responder', active: true, team: 'team-bravo' });
    const db = env.authenticatedContext('resp1', { role: 'responder', active: true, team: 'team-alpha' }).firestore();
    await assertFails(db.doc('reports/r1').get());
  });

  test('a resident demoted to responder keeps only resident access', async () => {
    const stale = await as('res1', { role: 'resident', active: true });
    await setUser('res1', { role: 'responder', active: true, team: 'team-alpha' });
    await assertFails(stale.doc('reports/r1').get());
  });
});

describe('users', () => {
  test('self reads own profile', async () => { await assertSucceeds(ctx.resident().doc('users/res1').get()); });
  test('resident cannot read other profile', async () => { await assertFails(ctx.resident().doc('users/res2').get()); });
  test('administrator reads any profile; dispatcher cannot', async () => {
    await assertSucceeds(ctx.admin().doc('users/res2').get());
    await assertFails(ctx.dispatcher().doc('users/res2').get());
  });
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
  // F05 decision D1 now reads: the audit log is administrator only (professor clarification, option A).
  test('administrator reads; dispatcher and dmo are denied (F05, decision D1)', async () => {
    await assertSucceeds(ctx.admin().doc('auditLogs/a1').get());
    await assertFails(ctx.dispatcher().doc('auditLogs/a1').get());
    await assertFails(ctx.dmo().doc('auditLogs/a1').get());
  });
  // F05 matrix: the audit log is administrator only. Rules, API GET /audit and navigation must agree.
  const auditMatrix = { resident: false, responderA: false, dispatcher: false, dmo: false, admin: true };
  for (const [who, allowed] of Object.entries(auditMatrix)) {
    test(`audit matrix: ${who} read is ${allowed ? 'allowed' : 'denied'}`, async () => {
      const read = ctx[who]().doc('auditLogs/a1').get();
      if (allowed) await assertSucceeds(read);
      else await assertFails(read);
    });
  }
  test('inactive admin cannot read the audit log', async () => {
    const db = await as('adm1', { role: 'admin', active: false });
    await assertFails(db.doc('auditLogs/a1').get());
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
  test('administrator and a responder of that team read; dispatcher and dmo cannot', async () => {
    await assertSucceeds(ctx.admin().doc('teams/team-alpha').get());
    await assertFails(ctx.dispatcher().doc('teams/team-alpha').get());
    await assertFails(ctx.dmo().doc('teams/team-alpha').get());
    await assertSucceeds(ctx.responderA().doc('teams/team-alpha').get());
  });
  test('resident cannot read', async () => { await assertFails(ctx.resident().doc('teams/team-alpha').get()); });
  test('responder cannot read another team', async () => { await assertFails(ctx.responderB().doc('teams/team-alpha').get()); });
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
  test('demo indicator is readable by active users and never writable', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await c.firestore().doc('config/demo').set({ active: true, label: 'Demo workspace · Sample data' }); });
    for (const who of ['resident', 'dispatcher', 'dmo', 'responderA']) {
      await assertSucceeds(ctx[who]().doc('config/demo').get());
      await assertFails(ctx[who]().doc('config/demo').set({ active: false }));
      await assertFails(ctx[who]().doc('config/demo').update({ active: false }));
    }
    await assertFails(ctx.anon().doc('config/demo').get());
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

describe('admin holds every staff read', () => {
  test('admin reads any report, team, user record, and audit entry', async () => {
    await assertSucceeds(ctx.admin().doc('reports/r1').get());
    await assertSucceeds(ctx.admin().doc('teams/team-alpha').get());
    await assertSucceeds(ctx.admin().doc('users/res1').get());
    await assertSucceeds(ctx.admin().doc('auditLogs/a1').get());
  });
  test('admin still cannot write report data directly', async () => {
    await assertFails(ctx.admin().doc('reports/r1').update({ status: 'Closed' }));
  });
  test('a resident still reads only their own reports', async () => {
    await assertFails(ctx.resident2().doc('reports/r1').get());
  });
});


describe('server-only report recovery jobs', () => {
  test('all client roles are denied recovery reads and writes', async () => {
    await env.withSecurityRulesDisabled(async c => { await c.firestore().doc('reportEffects/internal-job').set({ state: 'pending' }); });
    for (const who of ['anon', 'resident', 'dispatcher', 'dmo', 'responderA', 'admin']) {
      const db = ctx[who]();
      await assertFails(db.doc('reportEffects/internal-job').get());
      await assertFails(db.collection('reportEffects').get());
      await assertFails(db.doc('reportEffects/internal-job').set({ state: 'done' }));
    }
  });
});

describe('responder access to closed reports (the users document decides, a notification never grants)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await db.doc('reports/c1').set({ reporterId: 'res1', assignedTeamId: 'team-alpha', status: 'Closed', type: 'flood' });
      await db.doc('reports/c1/updates/cu1').set({ status: 'Resolved', byUid: 'resp1', kind: 'status' });
      await db.doc('notifications/nc1').set({ recipientUid: 'resp2', title: 'Team Assigned', reportId: 'c1' });
    });
  });

  test('current-team responder reads a closed report and its updates', async () => {
    await assertSucceeds(ctx.responderA().doc('reports/c1').get());
    await assertSucceeds(ctx.responderA().doc('reports/c1/updates/cu1').get());
    await assertSucceeds(ctx.responderA().collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
  });

  test('another team responder is denied the closed report and its updates', async () => {
    await assertFails(ctx.responderB().doc('reports/c1').get());
    await assertFails(ctx.responderB().doc('reports/c1/updates/cu1').get());
  });

  test('responder whose user document has the team cleared is denied, though the token still names it', async () => {
    const db = await as('resp7', { role: 'responder', active: true, team: 'team-alpha' });
    await assertSucceeds(db.doc('reports/c1').get());
    await setUser('resp7', { role: 'responder', active: true, team: '' });
    await assertFails(db.doc('reports/c1').get());
    await assertFails(db.doc('reports/c1/updates/cu1').get());
  });

  test('responder whose team changed is denied for the old team and reads only the new team', async () => {
    const db = await as('resp7', { role: 'responder', active: true, team: 'team-alpha' });
    await setUser('resp7', { role: 'responder', active: true, team: 'team-bravo' });
    await assertFails(db.doc('reports/c1').get());
    await assertFails(db.doc('reports/c1/updates/cu1').get());
    await assertFails(db.collection('reports').where('assignedTeamId', '==', 'team-alpha').get());
  });

  test('a token that names the new team, with a stale document, is denied', async () => {
    const db = await as('resp7', { role: 'responder', active: true, team: 'team-bravo' });
    await setUser('resp7', { role: 'responder', active: true, team: 'team-alpha' });
    await assertFails(db.doc('reports/c1').get());
  });

  test('deactivated responder is denied even with a team and an active token', async () => {
    const db = await as('resp7', { role: 'responder', active: true, team: 'team-alpha' });
    await setUser('resp7', { role: 'responder', active: false, team: 'team-alpha' });
    await assertFails(db.doc('reports/c1').get());
    await assertFails(db.doc('reports/c1/updates/cu1').get());
  });

  test('a responder whose role was changed away is denied', async () => {
    const db = await as('resp7', { role: 'responder', active: true, team: 'team-alpha' });
    await setUser('resp7', { role: 'resident', active: true, team: 'team-alpha' });
    await assertFails(db.doc('reports/c1').get());
  });

  test('a notification that names the report does not grant read of the report', async () => {
    const db = ctx.responderB();
    await assertSucceeds(db.doc('notifications/nc1').get());
    await assertFails(db.doc('reports/c1').get());
  });

  test('closed reports stay read-only for responders', async () => {
    await assertFails(ctx.responderA().doc('reports/c1').update({ status: 'Resolved' }));
    await assertFails(ctx.responderA().doc('reports/c1/updates/new').set({ status: 'Resolved', byUid: 'resp1' }));
  });
});

// Photo cleanup ledger: server-only. No client role may read or write any ledger row, including the rows of its own uploads.
describe('photo cleanup ledger is closed to every client role', () => {
  const ledgerRow = 'photoAssets/pa1';
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await c.firestore().doc(ledgerRow).set({ assetId: 'disaster-rescue/pa1', uid: 'res1', state: 'reserved', generation: 1 });
    });
  });

  for (const [who, make] of [['anonymous', () => ctx.anon()], ['resident owner', () => ctx.resident('res1')], ['dispatcher', () => ctx.dispatcher()], ['admin', () => ctx.admin()], ['responder', () => ctx.responderA()]]) {
    test(`${who} cannot read a ledger row`, async () => { await assertFails(make().doc(ledgerRow).get()); });
    test(`${who} cannot write a ledger row`, async () => { await assertFails(make().doc(ledgerRow).update({ state: 'committed' })); });
    test(`${who} cannot create a ledger row`, async () => { await assertFails(make().doc('photoAssets/pa2').set({ state: 'committed' })); });
  }
});

// Operational outbox is never a client capability, including for administrators.
test('mutation recovery plans are server-only for every role', async () => {
 for (const actor of Object.values(ctx)) {
  const db = actor();
  await assertFails(db.doc('mutationEffects/private-job').get());
  await assertFails(db.doc('mutationEffects/private-job').set({state:'done'}));
 }
});
