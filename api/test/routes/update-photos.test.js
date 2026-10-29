import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const png = (n = 1) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([n])]);
const base = {
  type: 'flood', description: 'Water rising', status: 'Rescue in Progress', verified: true, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA', assignedTeamId: 'tA', assignedTeamIds: ['tA'],
};

async function setup() {
  const t = makeTestApp();
  await t.repo.saveTeam('tA', { name: 'Team A', busy: true });
  await t.repo.createUser('rsp-a', { name: 'Rafa', role: 'responder', team: 'tA', active: true });
  const id = await t.repo.createReport(base);
  const send = () => request(t.app).post(`/api/reports/${id}/updates`).set('Authorization', t.as('responder', 'rsp-a'));
  return { t, id, send };
}
const form = (r) => r.field('status', 'Rescue in Progress').field('peopleRescued', '3').field('note', 'Boat arrived');

describe('responder update photos', () => {
  it('an update without a photo still succeeds (JSON)', async () => {
    const { send, t, id } = await setup();
    const res = await send().send({ status: 'Rescue in Progress', peopleRescued: 2, note: 'x' });
    expect(res.status).toBe(200);
    const [u] = (await t.repo.listUpdates(id)).filter((x) => x.kind === 'status');
    expect(u.photos ?? []).toEqual([]);
  });

  it('a multipart update with no photo succeeds', async () => {
    const { send } = await setup();
    const res = await form(send());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'Rescue in Progress', peopleRescued: 3 });
  });

  it('up to five photos are uploaded and stored on the update', async () => {
    const { send, t, id } = await setup();
    let r = form(send());
    for (let i = 0; i < 5; i++) r = r.attach('photos', png(i), { filename: `p${i}.png`, contentType: 'image/png' });
    const res = await r;
    expect(res.status).toBe(200);
    const [u] = (await t.repo.listUpdates(id)).filter((x) => x.kind === 'status');
    expect(u.photos).toHaveLength(5);
    expect(u.photos[0]).toMatchObject({ url: expect.stringMatching(/^https:\/\//), mimeType: 'image/png' });
    expect(u.photos[0].publicId).toBeUndefined();
  });

  it('a sixth photo is refused', async () => {
    const { send } = await setup();
    let r = form(send());
    for (let i = 0; i < 6; i++) r = r.attach('photos', png(i), { filename: `p${i}.png`, contentType: 'image/png' });
    const res = await r;
    expect(res.status).toBe(400);
  });

  it('a non-image file is refused and nothing is uploaded', async () => {
    const { send, t } = await setup();
    const res = await form(send()).attach('photos', Buffer.from('not an image'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('a bad status removes nothing and uploads nothing', async () => {
    const { send, t } = await setup();
    const res = await send().field('status', 'Nope').field('peopleRescued', '1').attach('photos', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('a replay of the same key does not upload again', async () => {
    const { send, t } = await setup();
    const go = () => form(send().set('Idempotency-Key', 'key-abcdefgh')).attach('photos', png(), { filename: 'a.png', contentType: 'image/png' });
    expect((await go()).status).toBe(200);
    expect((await go()).status).toBe(200);
    expect(t.uploader.calls).toHaveLength(1);
  });

  it('a failed upload gives an error and records no update', async () => {
    const { send, t, id } = await setup();
    t.uploader.failNext = true;
    const res = await form(send()).attach('photos', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect((await t.repo.listUpdates(id)).filter((x) => x.kind === 'status')).toHaveLength(0);
  });

  it('a failed upload asks the provider to delete the ids it had reserved', async () => {
    const { send, t } = await setup();
    t.uploader.failNext = true;
    await form(send()).attach('photos', png(), { filename: 'a.png', contentType: 'image/png' }).attach('photos', png(2), { filename: 'b.png', contentType: 'image/png' });
    expect(t.uploader.removed).toHaveLength(2);
    expect(t.uploader.removed[0].publicId).toMatch(/^disaster-rescue\//);
  });

  it('an illegal transition is refused before any photo is uploaded', async () => {
    const { t } = await setup();
    const id = await t.repo.createReport({ ...base, status: 'Team Assigned' });
    const res = await request(t.app).post(`/api/reports/${id}/updates`).set('Authorization', t.as('responder', 'rsp-a'))
      .field('status', 'Resolved').field('peopleRescued', '1').attach('photos', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(409);
    expect(t.uploader.calls).toHaveLength(0);
  });
});
