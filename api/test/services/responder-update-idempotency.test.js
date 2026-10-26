import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { addUpdate, findUpdateReceipt } from '../../src/services/assignmentService.js';

// A responder whose update reply was lost retries with the same Idempotency-Key. The retry must replay
// the first result and must not write a second row, because peopleRescued is summed across rows.
async function fixture() {
  const d = makeTestApp();
  await d.repo.createUser('resp', { name: 'R', role: 'responder', active: true, team: 'team-a', createdAt: new Date() });
  await d.repo.createUser('other', { name: 'O', role: 'responder', active: true, team: 'team-a', createdAt: new Date() });
  const reportId = await d.repo.createReport({ location: { lat: 14.8512, lng: 120.8123 }, status: 'Rescue in Progress', assignedTeamId: 'team-a', reporterId: 'res', reference: 'R-1', createdAt: new Date() });
  const rescued = async () => (await d.repo.listUpdates(reportId)).reduce((s, u) => s + (u.peopleRescued ?? 0), 0);
  return { d, reportId, rescued, user: { uid: 'resp', role: 'responder' } };
}
const body = { position: { lat: 14.8512, lng: 120.8123 }, status: 'Rescue in Progress', peopleRescued: 3, note: 'Two adults moved' };

describe('responder update idempotency', () => {
  it('a retry with the same key replays the first result and writes no second row', async () => {
    const { d, reportId, rescued, user } = await fixture();
    const first = await addUpdate({ repo: d.repo }, user, reportId, body, 'retry-key-0001');
    const again = await addUpdate({ repo: d.repo }, user, reportId, body, 'retry-key-0001');
    expect(again).toEqual(first);
    expect((await d.repo.listUpdates(reportId))).toHaveLength(1);
    expect(await rescued()).toBe(3);
  });

  it('a replay of a Resolved update still succeeds after the report is closed to further changes', async () => {
    const { d, reportId, rescued, user } = await fixture();
    const resolved = { position: { lat: 14.8512, lng: 120.8123 }, status: 'Resolved', peopleRescued: 5 };
    const first = await addUpdate({ repo: d.repo }, user, reportId, resolved, 'resolve-key-01');
    const again = await addUpdate({ repo: d.repo }, user, reportId, resolved, 'resolve-key-01');
    expect(again).toEqual(first);
    expect(await rescued()).toBe(5);
  });

  it('a different key is a new update', async () => {
    const { d, reportId, rescued, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'key-aaaaaaaa');
    await addUpdate({ repo: d.repo }, user, reportId, body, 'key-bbbbbbbb');
    expect(await rescued()).toBe(6);
  });

  it('keys are scoped to the account, so another responder with the same key writes their own row', async () => {
    const { d, reportId, rescued, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'shared-key-01');
    await addUpdate({ repo: d.repo }, { uid: 'other', role: 'responder' }, reportId, body, 'shared-key-01');
    expect(await d.repo.listUpdates(reportId)).toHaveLength(2);
    expect(await rescued()).toBe(6);
  });

  it('a retry after the responder moved to another team is refused, not replayed', async () => {
    const { d, reportId, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'moved-key-0001');
    await d.repo.updateUser('resp', { team: 'team-b' });
    await expect(addUpdate({ repo: d.repo }, user, reportId, body, 'moved-key-0001'))
      .rejects.toMatchObject({ status: 404 });
    expect(await d.repo.listUpdates(reportId)).toHaveLength(1);
  });

  it('a receipt lookup finds the saved update by key and writes nothing', async () => {
    const { d, reportId, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'receipt-key-01');
    const before = await d.repo.listUpdates(reportId);
    const receipt = await findUpdateReceipt({ repo: d.repo }, user, reportId, 'receipt-key-01');
    expect(receipt).toMatchObject({ saved: true, id: reportId, status: 'Rescue in Progress', peopleRescued: 3 });
    expect(await d.repo.listUpdates(reportId)).toEqual(before);
  });

  it('a receipt lookup with no matching update says so, and creates nothing', async () => {
    const { d, reportId, user } = await fixture();
    expect(await findUpdateReceipt({ repo: d.repo }, user, reportId, 'never-sent-01')).toEqual({ saved: false });
    expect(await d.repo.listUpdates(reportId)).toHaveLength(0);
  });

  it('a receipt lookup is refused once the responder has moved to another team', async () => {
    const { d, reportId, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'moved-receipt-01');
    await d.repo.updateUser('resp', { team: 'team-b' });
    await expect(findUpdateReceipt({ repo: d.repo }, user, reportId, 'moved-receipt-01')).rejects.toMatchObject({ status: 404 });
  });

  it('a receipt lookup needs a well-formed key', async () => {
    const { d, reportId, user } = await fixture();
    await expect(findUpdateReceipt({ repo: d.repo }, user, reportId, 'x')).rejects.toMatchObject({ status: 400, code: 'invalid_idempotency_key' });
    await expect(findUpdateReceipt({ repo: d.repo }, user, reportId, undefined)).rejects.toMatchObject({ status: 400 });
  });

  it('the receipt route answers with the lookup and does not accept writes', async () => {
    const { d, reportId, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body, 'route-receipt-1');
    const ok = await request(d.app).get(`/api/reports/${reportId}/updates/receipt`)
      .set('Authorization', d.as('responder', user.uid)).set('Idempotency-Key', 'route-receipt-1');
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ saved: true });
    const none = await request(d.app).get(`/api/reports/${reportId}/updates/receipt`)
      .set('Authorization', d.as('responder', user.uid)).set('Idempotency-Key', 'route-receipt-2');
    expect(none.body).toEqual({ saved: false });
    const dispatcher = await request(d.app).get(`/api/reports/${reportId}/updates/receipt`)
      .set('Authorization', d.as('dispatcher', 'disp-1')).set('Idempotency-Key', 'route-receipt-1');
    expect(dispatcher.status).toBe(403);
    expect(await d.repo.listUpdates(reportId)).toHaveLength(1);
  });

  it('a malformed key is refused before anything is written', async () => {
    const { d, reportId, user } = await fixture();
    await expect(addUpdate({ repo: d.repo }, user, reportId, body, 'short'))
      .rejects.toMatchObject({ status: 400, code: 'invalid_idempotency_key' });
    expect(await d.repo.listUpdates(reportId)).toHaveLength(0);
  });

  it('without a key, each request is recorded as before', async () => {
    const { d, reportId, rescued, user } = await fixture();
    await addUpdate({ repo: d.repo }, user, reportId, body);
    await addUpdate({ repo: d.repo }, user, reportId, body);
    expect(await rescued()).toBe(6);
  });

  it('the route passes the Idempotency-Key header through, and a retry replays', async () => {
    const { d, reportId, rescued, user } = await fixture();
    const send = () => request(d.app).post(`/api/reports/${reportId}/updates`)
      .set('Authorization', d.as('responder', user.uid))
      .set('Idempotency-Key', 'route-key-0001')
      .send(body);
    const a = await send();
    const b = await send();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(await rescued()).toBe(3);
  });
});
