import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { attemptKey, lockState, nextAfterFailure, MAX_FAILED_ATTEMPTS, LOCKOUT_MS } from '../../src/domain/loginAttempts.js';

describe('login attempt rules', () => {
  it('locks on the fifth failure and not before', () => {
    let record = null;
    const now = 1_000_000;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      record = nextAfterFailure(record, now);
      expect(lockState(record, now).locked).toBe(false);
    }
    record = nextAfterFailure(record, now);
    expect(lockState(record, now)).toEqual({ locked: true, retryAfterSeconds: LOCKOUT_MS / 1000 });
  });

  it('starts a fresh count once the lock has expired', () => {
    const locked = { count: 0, lockedUntil: 5000 };
    expect(lockState(locked, 4999).locked).toBe(true);
    expect(lockState(locked, 5000).locked).toBe(false);
    expect(nextAfterFailure(locked, 5000)).toEqual({ count: 1, lockedUntil: 0 });
  });

  it('keys by email without storing the address, ignoring case and spaces', () => {
    expect(attemptKey('  Ana@Example.com ', '10.0.0.1')).toBe(attemptKey('ana@example.com', '10.0.0.1'));
    expect(attemptKey('ana@example.com', '10.0.0.1')).not.toBe(attemptKey('ana@example.com', '10.0.0.2'));
    expect(attemptKey('ana@example.com', '10.0.0.1')).not.toContain('@');
  });
});

describe('sign-in lockout routes', () => {
  it('locks an email after five failures and clears the lock on a verified success', async () => {
    const t = makeTestApp();
    const email = 'victim@example.com';

    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await request(t.app).post('/api/auth/sign-in/failure').send({ email });
    }
    const check = await request(t.app).post('/api/auth/sign-in/check').send({ email });
    expect(check.status).toBe(200);
    expect(check.body.locked).toBe(true);
    expect(check.body.retryAfterSeconds).toBeGreaterThan(0);

    // Without a token the lock cannot be cleared.
    const anon = await request(t.app).post('/api/auth/sign-in/success');
    expect(anon.status).toBe(401);
    const stillLocked = await request(t.app).post('/api/auth/sign-in/check').send({ email });
    expect(stillLocked.body.locked).toBe(true);

    // A verified sign-in for this email clears it.
    const ok = await request(t.app).post('/api/auth/sign-in/success').set('Authorization', `Bearer new:uid-1:${email}`);
    expect(ok.status).toBe(200);
    const cleared = await request(t.app).post('/api/auth/sign-in/check').send({ email });
    expect(cleared.body.locked).toBe(false);
  });

  it('one address cannot lock the same email for a different address', async () => {
    const t = makeTestApp({ trustProxy: 1 });
    const email = 'victim@example.com';
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await request(t.app).post('/api/auth/sign-in/failure').set('X-Forwarded-For', '198.51.100.7').send({ email });
    }
    const attacker = await request(t.app).post('/api/auth/sign-in/check').set('X-Forwarded-For', '198.51.100.7').send({ email });
    expect(attacker.body.locked).toBe(true);
    const person = await request(t.app).post('/api/auth/sign-in/check').set('X-Forwarded-For', '203.0.113.9').send({ email });
    expect(person.body.locked).toBe(false);
  });

  it('answers the same way for an unknown email, so it reveals nothing about accounts', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/auth/sign-in/check').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ locked: false, retryAfterSeconds: 0 });
  });

  it('rejects a request without an email', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/auth/sign-in/failure').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_email');
  });
});
