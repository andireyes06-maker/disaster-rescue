import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { submissionFingerprint } from '../../src/services/reportService.js';
import { parseReportInput } from '../../src/domain/validation.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const fields = { type: 'flood', description: 'Water rising fast', lat: '14.8512', lng: '120.8123', source: 'gps' };

function post(t, auth = t.as('resident'), over = {}, photos = []) {
  let r = request(t.app).post('/api/reports');
  if (auth) r = r.set('Authorization', auth);
  for (const [k, v] of Object.entries({ ...fields, ...over })) r = r.field(k, v);
  photos.forEach((b, i) => { r = r.attach('photos', b, { filename: `p${i}.jpg` }); });
  return r;
}
const writes = async (t) => (await t.repo.listReports()).length;

describe('POST /api/reports', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('201 with id, status and reference; stores the report', async () => {
    const t = makeTestApp();
    const res = await post(t, t.as('resident', 'res-9'), { contactName: 'Ana', contactPhone: '09171234567', addressText: 'Main St' }, [JPEG, PNG]);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'Submitted' });
    expect(res.body.reference).toMatch(/^DR-[0-9A-Z]{6}$/);
    const r = await t.repo.getReport(res.body.id);
    expect(r).toMatchObject({
      status: 'Submitted', verified: false, priority: 'medium', reporterId: 'res-9', type: 'flood',
      location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, contact: { name: 'Ana', phone: '09171234567' },
      addressText: 'Main St', reference: res.body.reference,
    });
    expect(r.coarseLocation).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
    expect(r.coarseLocation).not.toEqual({ lat: 14.8512, lng: 120.8123 });
    expect(r.photos).toHaveLength(2);
    expect(r.photos[0]).toMatchObject({ url: expect.stringContaining('https://fake.cdn/'), mimeType: 'image/jpeg' });
    expect(r.possibleDuplicates).toEqual([]);
  });

  it('works without photos or contact', async () => {
    const t = makeTestApp();
    const res = await post(t);
    expect(res.status).toBe(201);
    expect((await t.repo.getReport(res.body.id)).photos).toEqual([]);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('writes an audit entry report.create', async () => {
    const t = makeTestApp();
    const res = await post(t, t.as('resident', 'res-9'));
    const a = await t.repo.listAudit({ action: 'report.create' });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ actorUid: 'res-9', reportId: res.body.id });
  });

  it('flags possible duplicates but still returns 201', async () => {
    const t = makeTestApp();
    const first = await post(t);
    const second = await post(t, t.as('resident', 'res-2'), { lat: '14.8513' });
    expect(second.status).toBe(201);
    expect((await t.repo.getReport(second.body.id)).possibleDuplicates).toEqual([first.body.id]);
  });

  it.each(['abc', 'NaN', '95', '181', '', '0x10', '1e1'])('400 and no writes or uploads for bad lat/lng %j', async (bad) => {
    const t = makeTestApp();
    const lat = await post(t, undefined, { lat: bad }, [JPEG]);
    expect(lat.status).toBe(400);
    if (bad !== '95') expect((await post(t, undefined, { lng: bad }, [JPEG])).status).toBe(400); // 95 is a valid longitude
    expect(await writes(t)).toBe(0);
    expect(t.uploader.calls).toHaveLength(0);
    expect(await t.repo.listAudit()).toHaveLength(0);
  });

  it('400 and nothing uploaded for a fake JPEG', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, {}, [JPEG, Buffer.from('MZ\x90\x00 not an image')]);
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
    expect(await writes(t)).toBe(0);
  });

  it('400 and nothing uploaded for a zero-byte photo', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, {}, [Buffer.alloc(0)]);
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
    expect(await writes(t)).toBe(0);
  });

  it('400 and nothing uploaded for a sixth photo', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, {}, Array(6).fill(JPEG));
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
    expect(await writes(t)).toBe(0);
  });

  it('400 for a photo over 5 MB', async () => {
    const t = makeTestApp();
    const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await post(t, undefined, {}, [big]);
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('400 for a file under the wrong field name', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/reports').set('Authorization', t.as('resident'))
      .field('type', 'flood').field('description', 'Water rising').field('lat', '14').field('lng', '120').field('source', 'gps')
      .attach('files', JPEG, { filename: 'a.jpg' });
    expect(res.status).toBe(400);
    expect(t.uploader.calls).toHaveLength(0);
    expect(await writes(t)).toBe(0);
  });

  it('ignores mass-assigned fields', async () => {
    const t = makeTestApp();
    const res = await post(t, t.as('resident', 'res-3'), { status: 'Closed', reporterId: 'x', priority: 'high', verified: 'true', assignedTeamId: 't1' });
    expect(res.status).toBe(201);
    const r = await t.repo.getReport(res.body.id);
    expect(r).toMatchObject({ status: 'Submitted', priority: 'medium', verified: false, reporterId: 'res-3' });
    expect(r.assignedTeamId).toBeUndefined();
  });

  it('a failed commit after upload is 500 and removes the uploaded assets (unkeyed requests use the same claim path)', async () => {
    const t = makeTestApp();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    t.repo.commitSubmission = async () => { throw new Error('db down'); };
    const res = await post(t, undefined, {}, [JPEG, PNG]);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    expect(t.uploader.removed).toHaveLength(2);
    expect(t.uploader.removed.map((x) => x.publicId)).toEqual(['fake-1', 'fake-2']);
  });

  it('lists open reports before uploading', async () => {
    const t = makeTestApp();
    t.repo.listOpenReports = async () => { throw new Error('read fail'); };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(t, undefined, {}, [JPEG]);
    expect(res.status).toBe(500);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('audit failure after create still returns 201 with one stored report', async () => {
    const t = makeTestApp();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    t.repo.addAudit = async () => { throw new Error('audit down'); };
    const res = await post(t);
    expect(res.status).toBe(201);
    expect(await writes(t)).toBe(1);
    expect(err).toHaveBeenCalled();
  });

  it('does not expose public ids in stored photos', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, {}, [JPEG]);
    expect((await t.repo.getReport(res.body.id)).photos[0]).not.toHaveProperty('publicId');
  });

  it('400 for empty contact name', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, { contactName: ' ', contactPhone: '09171234567' });
    expect(res.status).toBe(400);
    expect(await writes(t)).toBe(0);
  });

  it('strips tags from the description', async () => {
    const t = makeTestApp();
    const res = await post(t, undefined, { description: '<script>alert(1)</script>Flood' });
    expect(res.status).toBe(201);
    expect((await t.repo.getReport(res.body.id)).description).toBe('alert(1)Flood');
  });

  it('403 for a dispatcher', async () => {
    const t = makeTestApp();
    const res = await post(t, t.as('admin'));
    expect(res.status).toBe(403);
    expect(await writes(t)).toBe(0);
  });

  it('401 without a token', async () => {
    const t = makeTestApp();
    expect((await post(t, null)).status).toBe(401);
  });

  it('403 for a deactivated user', async () => {
    const t = makeTestApp();
    const res = await post(t, t.as('off'));
    expect(res.status).toBe(403);
    expect(await writes(t)).toBe(0);
  });

  it('upload failure returns 5xx and creates nothing', async () => {
    const t = makeTestApp();
    t.uploader.failNext = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(t, undefined, {}, [JPEG]);
    expect(res.status).toBe(500);
    expect(await writes(t)).toBe(0);
  });

  it('notifies dispatchers, and a throwing notifier never fails the report', async () => {
    const notifyRole = vi.fn(async () => { throw new Error('push down'); });
    const t = makeTestApp({ notifier: { notifyUsers: async () => {}, notifyRole } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(t);
    expect(res.status).toBe(201);
    expect(notifyRole).toHaveBeenCalledWith('dispatcher', expect.objectContaining({ reportId: res.body.id }));
    expect(err).toHaveBeenCalled();
  });
});

describe('idempotent submission (M04)', () => {
  const KEY = 'k-0123456789abcdefABCDEF';
  const send = (t, key) => {
    let r = request(t.app).post('/api/reports').set('Authorization', t.as('resident'));
    if (key !== undefined) r = r.set('Idempotency-Key', key);
    for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
    return r;
  };

  it('a retry with the same key returns the original report and creates no second one', async () => {
    const t = makeTestApp();
    const first = await send(t, KEY);
    const retry = await send(t, KEY);
    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual(first.body);
    expect(await writes(t)).toBe(1);
  });

  it('two requests with the same key at the same time create one report', async () => {
    const t = makeTestApp();
    const rs = await Promise.all([send(t, KEY), send(t, KEY)]);
    // Each reply is either the created report or a refusal while the first attempt is in flight. Never two reports.
    for (const r of rs) expect([201, 409]).toContain(r.status);
    const created = rs.filter((r) => r.status === 201).map((r) => r.body);
    expect(created.every((b) => b.id === created[0].id)).toBe(true);
    expect(await writes(t)).toBe(1);
  });

  it('a key whose first attempt is still in flight is refused, not run twice', async () => {
    const t = makeTestApp();
    // The first attempt claimed the key for this same submission, so its fingerprint matches the retry.
    const fingerprint = submissionFingerprint(parseReportInput(fields), []);
    const claim = { fingerprint, now: Date.now(), reportId: 'reserved-1', reference: 'DR-HOLD01', leaseMs: 120000 };
    expect((await t.repo.claimSubmission('res-x', KEY, claim)).mode).toBe('run');
    const second = await t.repo.claimSubmission('res-x', KEY, { ...claim, reportId: 'reserved-2' });
    expect(second.mode).toBe('pending');
    const res = await request(t.app).post('/api/reports').set('Authorization', t.as('resident', 'res-x')).set('Idempotency-Key', KEY).field('type', 'flood').field('description', 'Water rising fast').field('lat', '14.8512').field('lng', '120.8123').field('source', 'gps');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('submission_in_progress');
    expect(await writes(t)).toBe(0);
  });

  it('separate submissions with different keys are separate reports', async () => {
    const t = makeTestApp();
    await send(t, KEY);
    await send(t, 'k-zyxwvutsrqponmlkjihg');
    expect(await writes(t)).toBe(2);
  });

  it('a malformed key is refused before anything is created', async () => {
    const t = makeTestApp();
    const res = await send(t, 'short');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_idempotency_key');
    expect(await writes(t)).toBe(0);
  });
});

