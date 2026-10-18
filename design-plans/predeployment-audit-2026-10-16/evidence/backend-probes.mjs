// Isolated regression probes: no services, network requests, or product writes.
// Assertions document the observed defects at e9c6426; reverse them after fixes.
import assert from 'node:assert/strict';
import { createMemoryRepo } from '/Users/rien/Documents/FINAL_PROJECT/api/test/fakes/memoryRepo.js';
import { createFakeAuth } from '/Users/rien/Documents/FINAL_PROJECT/api/test/fakes/fakeAuth.js';
import { assign, addUpdate } from '/Users/rien/Documents/FINAL_PROJECT/api/src/services/assignmentService.js';
import { listPublicIncidents } from '/Users/rien/Documents/FINAL_PROJECT/api/src/services/publicIncidentService.js';
import { updateStaff } from '/Users/rien/Documents/FINAL_PROJECT/api/src/services/userService.js';

const report = (status) => ({
  status, verified: true, type: 'flood', reporterId: 'synthetic-resident',
  reference: 'DR-SYNTHETIC', location: { lat: 14.85, lng: 120.81, source: 'gps' },
  coarseLocation: { lat: 14.85, lng: 120.81 }, photos: [],
});

// BE-02: Two different incidents compete for the same free team.
{
  const repo = createMemoryRepo();
  await repo.saveTeam('synthetic-team', { name: 'Synthetic team', busy: false });
  const first = await repo.createReport(report('Awaiting Assignment'));
  const second = await repo.createReport(report('Awaiting Assignment'));
  const results = await Promise.allSettled([
    assign({ repo }, { uid: 'synthetic-dispatcher-a', role: 'dispatcher' }, first, { teamId: 'synthetic-team' }),
    assign({ repo }, { uid: 'synthetic-dispatcher-b', role: 'dispatcher' }, second, { teamId: 'synthetic-team' }),
  ]);
  assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'fulfilled']);
  const reports = await repo.listReports();
  assert.equal(reports.filter((r) => r.status === 'Team Assigned' && r.assignedTeamId === 'synthetic-team').length, 2);
  const team = await repo.getTeam('synthetic-team');
  assert.ok([first, second].includes(team.currentReportId));
  console.log('BE-02 CONFIRMED: two successful assignments, two assigned reports, one team current-report pointer.');
}

// BE-03: A dependency failure after resolution loses its details permanently.
{
  const repo = createMemoryRepo();
  const id = await repo.createReport({ ...report('Rescue in Progress'), assignedTeamId: 'synthetic-team' });
  await repo.createUser('synthetic-responder', { role: 'responder', active: true, team: 'synthetic-team' });
  const actor = { uid: 'synthetic-responder', role: 'responder' };
  const body = { status: 'Resolved', note: 'Synthetic resolution detail', peopleRescued: 2 };
  const realAddUpdate = repo.addUpdate;
  repo.addUpdate = async () => { throw new Error('synthetic update write failure'); };
  await assert.rejects(addUpdate({ repo }, actor, id, body), /synthetic update write failure/);
  repo.addUpdate = realAddUpdate;
  assert.equal((await repo.getReport(id)).status, 'Resolved');
  assert.deepEqual(await repo.listUpdates(id), []);
  await assert.rejects(addUpdate({ repo }, actor, id, body), (err) => err.code === 'illegal_transition' && err.status === 409);
  console.log('BE-03 CONFIRMED: failed update leaves Resolved with no details; retry returns 409.');
}

// BE-04: A report using the schema produced by create() is omitted publicly.
{
  const repo = createMemoryRepo();
  await repo.createReport(report('Verified'));
  assert.deepEqual(await listPublicIncidents({ repo }), []);
  console.log('BE-04 CONFIRMED: eligible report with canonical nested coordinates produces an empty public projection.');
}

// BE-07: Concurrent cross-target changes bypass the final-admin invariant.
{
  const repo = createMemoryRepo();
  const auth = createFakeAuth();
  for (const uid of ['synthetic-admin-a', 'synthetic-admin-b']) {
    await repo.createUser(uid, { name: uid, role: 'admin', active: true });
    auth.users.set(uid, { uid, disabled: false, customClaims: { role: 'admin', active: true } });
  }
  const results = await Promise.allSettled([
    updateStaff({ repo, auth }, 'synthetic-admin-b', { active: false }, { uid: 'synthetic-admin-a', role: 'admin' }),
    updateStaff({ repo, auth }, 'synthetic-admin-a', { active: false }, { uid: 'synthetic-admin-b', role: 'admin' }),
  ]);
  assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'fulfilled']);
  assert.equal((await repo.listUsers()).filter((u) => u.role === 'admin' && u.active === true).length, 0);
  console.log('BE-07 CONFIRMED: both cross-target deactivations succeed, leaving zero active administrators.');
}
console.log('All four defect reproduction assertions passed. These are findings, not release checks passing.');
