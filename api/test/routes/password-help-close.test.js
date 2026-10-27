import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('closing a password help request', () => {
  it('a missing request is 404, not a server error', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/auth/reset-help/nope-123/close').set('Authorization', t.as('admin'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('closing twice keeps the first close and writes one audit row', async () => {
    const t = makeTestApp();
    await t.repo.mutatePasswordHelp('help-1', () => ({ id: 'help-1', status: 'open', email: 'a@b.c' }));
    const first = await request(t.app).post('/api/auth/reset-help/help-1/close').set('Authorization', t.as('admin'));
    expect(first.status).toBe(200);
    const second = await request(t.app).post('/api/auth/reset-help/help-1/close').set('Authorization', t.as('admin'));
    expect(second.status).toBe(200);
    expect(second.body.alreadyClosed).toBe(true);
    const closes = await t.repo.listAudit({ action: 'password-help.close' });
    expect(closes.length).toBe(1);
  });
});
