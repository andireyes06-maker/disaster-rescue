import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const demoOn = { active: true, scenario: 'default', label: 'Demo workspace · Sample data', scenarioNow: '2026-10-17T00:00:00.000Z' };

describe('demo workspace exports are labeled as sample output', () => {
  it('names the CSV and PDF with the demo-sample prefix while the demo is active', async () => {
    const t = makeTestApp();
    t.repo.getDemoConfig = async () => demoOn;
    const csv = await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('admin'));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-disposition']).toContain('demo-sample-incidents.csv');
    const pdf = await request(t.app).get('/api/export/summary.pdf').set('Authorization', t.as('admin'))
      .buffer(true).parse((res, cb) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => cb(null, Buffer.concat(c))); });
    expect(pdf.headers['content-disposition']).toContain('demo-sample-summary.pdf');
  });

  it('keeps the plain filenames when no demo is configured', async () => {
    const t = makeTestApp();
    const csv = await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('admin'));
    expect(csv.headers['content-disposition']).toContain('"incidents.csv"');
    expect(csv.headers['content-disposition']).not.toContain('demo-sample');
  });

  it('keeps the plain filenames when the demo indicator is inactive', async () => {
    const t = makeTestApp();
    t.repo.getDemoConfig = async () => ({ ...demoOn, active: false });
    const csv = await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('admin'));
    expect(csv.headers['content-disposition']).not.toContain('demo-sample');
  });
});
