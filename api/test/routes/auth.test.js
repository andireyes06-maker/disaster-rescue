import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth, requireRole } from '../../src/middleware/auth.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { HttpError } from '../../src/errors.js';

const tokens = {
  res: { uid: 'u1', role: 'resident', active: true },
  dis: { uid: 'u2', role: 'dispatcher', active: true },
  off: { uid: 'u3', role: 'dispatcher', active: false },
  noact: { uid: 'u4', role: 'dispatcher' },
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
  it('403 account_disabled when the active claim is missing (fail closed)', async () => {
    const r = await request(app).get('/admin').set('Authorization', 'Bearer noact');
    expect(r.status).toBe(403); expect(r.body.error).toBe('account_disabled');
  });
  it('401 invalid_token when verifyToken resolves to undefined', async () => {
    const verifyNothing = async () => undefined;
    const a = express();
    a.get('/who', requireAuth(verifyNothing), (req, res) => res.json(req.user));
    a.use(errorHandler);
    const r = await request(a).get('/who').set('Authorization', 'Bearer x');
    expect(r.status).toBe(401); expect(r.body.error).toBe('invalid_token');
  });
});

const errApp = express();
errApp.get('/http409', (req, res, next) => next(new HttpError(409, 'conflict', 'Already exists')));
errApp.get('/http503', (req, res, next) => next(new HttpError(503, 'down', 'Maintenance window')));
errApp.get('/plain', (req, res, next) => next(new Error('secret database password')));
errApp.get('/status99999', (req, res, next) => next(Object.assign(new Error('weird'), { status: 99999 })));
errApp.get('/status413', (req, res, next) => next(Object.assign(new Error('entity too large'), { status: 413, expose: true })));
errApp.get('/statusString', (req, res, next) => next(Object.assign(new Error('odd'), { status: 'abc' })));
errApp.use(errorHandler);

describe('errorHandler', () => {
  it('HttpError 4xx echoes code and message', async () => {
    const r = await request(errApp).get('/http409');
    expect(r.status).toBe(409); expect(r.body).toEqual({ error: 'conflict', message: 'Already exists' });
  });
  it('HttpError 5xx returns 500 internal_error with no message', async () => {
    const r = await request(errApp).get('/http503');
    expect(r.status).toBe(500); expect(r.body).toEqual({ error: 'internal_error' });
  });
  it('plain Error returns 500 internal_error with no message or stack', async () => {
    const r = await request(errApp).get('/plain');
    expect(r.status).toBe(500); expect(r.body).toEqual({ error: 'internal_error' });
    expect(r.text).not.toContain('secret');
  });
  it('non-HttpError with numeric 4xx status returns bad_request without message', async () => {
    const r = await request(errApp).get('/status413');
    expect(r.status).toBe(413); expect(r.body).toEqual({ error: 'bad_request' });
  });
  it('out-of-range status returns 500', async () => {
    const r = await request(errApp).get('/status99999');
    expect(r.status).toBe(500); expect(r.body).toEqual({ error: 'internal_error' });
  });
  it('non-integer status returns 500', async () => {
    const r = await request(errApp).get('/statusString');
    expect(r.status).toBe(500); expect(r.body).toEqual({ error: 'internal_error' });
  });
  it('delegates to next(err) when headers are already sent', () => {
    const next = vi.fn();
    const err = new Error('late');
    const res = { headersSent: true, status: () => { throw new Error('should not be called'); } };
    expect(() => errorHandler(err, {}, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledWith(err);
  });
});
