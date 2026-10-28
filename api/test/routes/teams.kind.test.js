import { it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

it('creates a Medical team and reads it back', async () => {
  const t = makeTestApp();
  const made = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Medic One', kind: 'Medical' });
  expect(made.status).toBe(201);
  const list = await request(t.app).get('/api/teams').set('Authorization', t.as('admin'));
  expect(list.status).toBe(200);
  expect(list.body.find((x) => x.id === made.body.id).kind).toBe('Medical');
});

it('still rejects an unknown identity (400 invalid_kind)', async () => {
  const t = makeTestApp();
  const res = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Odd', kind: 'Pirates' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('invalid_kind');
  expect(res.body.message).toBe('Choose PNP, BFP, Rescue, Medical, MDDRMO or Other');
});
