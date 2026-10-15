import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth, requireRole } from '../../src/middleware/auth.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const tokens = {
  res: { uid: 'u1', role: 'resident', active: true },
  dis: { uid: 'u2', role: 'dispatcher', active: true },
  off: { uid: 'u3', role: 'dispatcher', active: false },
};
const verify = async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; };
const app = express();
app.get('/who', requireAuth(verify), (req, res) => res.json(req.user));
app.get('/admin', requireAuth(verify), requireRole('dispatcher'), (req, res) => res.json({ ok: true }));
app.use(errorHandler);

describe('auth', () => {
  it('401 without token', async () => { expect((await request(app).get('/who')).status).toBe(401); });
  it('401 with bad token', async () => { expect((await request(app).get('/who').set('Authorization', 'Bearer nope')).status).toBe(401); });
  it('200 with good token', async () => {
    const r = await request(app).get('/who').set('Authorization', 'Bearer res');
    expect(r.status).toBe(200); expect(r.body.role).toBe('resident');
  });
  it('403 wrong role', async () => { expect((await request(app).get('/admin').set('Authorization', 'Bearer res')).status).toBe(403); });
  it('200 right role', async () => { expect((await request(app).get('/admin').set('Authorization', 'Bearer dis')).status).toBe(200); });
  it('403 for deactivated user with valid token', async () => {
    const r = await request(app).get('/admin').set('Authorization', 'Bearer off');
    expect(r.status).toBe(403); expect(r.body.error).toBe('account_disabled');
  });
});
