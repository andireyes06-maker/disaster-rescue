import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// A form cut off before its closing boundary is a client error. It must not be reported as a server failure.
describe('malformed multipart bodies', () => {
  const truncated = '--XB\r\nContent-Disposition: form-data; name="description"\r\n\r\nhello\r\n--XB\r\nContent-Disposition: form-data; name="photos"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\nabc';

  it('a truncated multipart report is refused as a 400 invalid_upload, not a 500', async () => {
    const { app, as } = makeTestApp();
    const res = await request(app).post('/api/reports')
      .set('Authorization', as('resident'))
      .set('Content-Type', 'multipart/form-data; boundary=XB')
      .send(truncated);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'invalid_upload' });
  });
});
