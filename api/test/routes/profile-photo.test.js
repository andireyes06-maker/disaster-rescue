import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);

const put = (t, who, buf, name = 'photo.png') => {
  const req = request(t.app).put('/api/users/me/photo');
  if (who) req.set('Authorization', who);
  return buf ? req.attach('photo', buf, name) : req;
};
const me = (t, who) => request(t.app).get('/api/users/me').set('Authorization', who);

describe('profile photo (B1)', () => {
  it('a resident can upload a png and read it back through userView', async () => {
    const t = makeTestApp();
    const res = await put(t, t.as('resident'), PNG);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ photoUrl: 'https://fake.cdn/photo-1.jpg' });
    const stored = await t.repo.getUser('resident-1');
    expect(stored.photo).toMatchObject({ publicId: 'fake-1', url: 'https://fake.cdn/photo-1.jpg' });
    expect(stored.photo.updatedAt).toBeInstanceOf(Date);

    const view = await me(t, t.as('resident'));
    expect(view.status).toBe(200);
    expect(view.body).toEqual({
      uid: 'resident-1', name: 'resident-1', email: null, phone: null, role: 'resident', active: true,
      photoUrl: 'https://fake.cdn/photo-1.jpg',
    });
  });

  it('GET /api/users/me returns the caller with no photo internals and photoUrl null when unset', async () => {
    const t = makeTestApp();
    const res = await me(t, t.as('responder', 'r-9'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ uid: 'r-9', role: 'responder', active: true, photoUrl: null });
    expect(Object.keys(res.body).sort()).toEqual(['active', 'email', 'name', 'phone', 'photoUrl', 'role', 'uid']);
  });

  it('a text file named photo.jpg is refused (400 invalid_photo) and nothing is stored', async () => {
    const t = makeTestApp();
    const res = await put(t, t.as('resident'), Buffer.from('hello, I am not an image'), 'photo.jpg');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_photo');
    expect(t.uploader.calls).toHaveLength(0);
    expect((await t.repo.getUser('resident-1')).photo).toBeUndefined();
  });

  it('a file over 5 MB is refused (400 photo_too_large)', async () => {
    const t = makeTestApp();
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024, 0)]);
    const res = await put(t, t.as('resident'), big);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('photo_too_large');
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('no file gives 400 photo_required', async () => {
    const t = makeTestApp();
    const res = await put(t, t.as('resident'), null).field('note', 'x');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('photo_required');
  });

  it('replacing removes the old asset only after the new one is saved', async () => {
    const t = makeTestApp();
    expect((await put(t, t.as('resident'), PNG)).status).toBe(200);

    // A failed replacement keeps the old photo and removes nothing.
    t.uploader.failNext = true;
    const failed = await put(t, t.as('resident'), JPEG, 'b.jpg');
    expect(failed.status).toBe(500);
    expect(t.uploader.removed).toEqual([]);
    expect((await me(t, t.as('resident'))).body.photoUrl).toBe('https://fake.cdn/photo-1.jpg');

    const ok = await put(t, t.as('resident'), JPEG, 'b.jpg');
    expect(ok.status).toBe(200);
    expect(ok.body.photoUrl).toBe('https://fake.cdn/photo-2.jpg');
    expect(t.uploader.removed.map((x) => x.publicId)).toEqual(['fake-1']);
    expect((await t.repo.getUser('resident-1')).photo.publicId).toBe('fake-2');
  });

  it('a failed save removes the new upload and keeps the old photo', async () => {
    const t = makeTestApp();
    expect((await put(t, t.as('resident'), PNG)).status).toBe(200);
    const real = t.repo.updateUser;
    t.repo.updateUser = async () => { throw new Error('db down'); };
    const res = await put(t, t.as('resident'), JPEG, 'b.jpg');
    t.repo.updateUser = real;
    expect(res.status).toBe(500);
    expect(t.uploader.removed.map((x) => x.publicId)).toEqual(['fake-2']);
    expect((await t.repo.getUser('resident-1')).photo.publicId).toBe('fake-1');
  });

  it('DELETE returns to no photo and removes the asset', async () => {
    const t = makeTestApp();
    await put(t, t.as('resident'), PNG);
    const res = await request(t.app).delete('/api/users/me/photo').set('Authorization', t.as('resident'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ photoUrl: null });
    expect(t.uploader.removed.map((x) => x.publicId)).toEqual(['fake-1']);
    expect((await t.repo.getUser('resident-1')).photo).toBeNull();
    expect((await me(t, t.as('resident'))).body.photoUrl).toBeNull();

    // Deleting again is harmless and removes nothing more.
    const again = await request(t.app).delete('/api/users/me/photo').set('Authorization', t.as('resident'));
    expect(again.status).toBe(200);
    expect(t.uploader.removed).toHaveLength(1);
  });

  it('a failed asset removal still clears the photo', async () => {
    const t = makeTestApp();
    await put(t, t.as('resident'), PNG);
    t.uploader.remove = async () => { throw new Error('cdn down'); };
    const res = await request(t.app).delete('/api/users/me/photo').set('Authorization', t.as('resident'));
    expect(res.status).toBe(200);
    expect((await t.repo.getUser('resident-1')).photo).toBeNull();
  });

  it('signed-out request is 401', async () => {
    const t = makeTestApp();
    expect((await put(t, null, PNG)).status).toBe(401);
    expect((await request(t.app).delete('/api/users/me/photo')).status).toBe(401);
    expect((await request(t.app).get('/api/users/me')).status).toBe(401);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('a deactivated account is refused', async () => {
    const t = makeTestApp();
    const off = 'Bearer off:gone-1';
    const res = await put(t, off, PNG);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('account_disabled');
    expect((await me(t, off)).status).toBe(403);
    expect((await request(t.app).delete('/api/users/me/photo').set('Authorization', off)).status).toBe(403);
    expect(t.uploader.calls).toHaveLength(0);
  });

  it('there is no way to name another account', async () => {
    const t = makeTestApp();
    await t.repo.createUser('other-1', { name: 'Other', role: 'resident', active: true });
    const res = await request(t.app).put('/api/users/other-1/photo').set('Authorization', t.as('admin')).attach('photo', PNG, 'p.png');
    expect(res.status).toBe(404);
    const del = await request(t.app).delete('/api/users/other-1/photo').set('Authorization', t.as('admin'));
    expect(del.status).toBe(404);
    expect(t.uploader.calls).toHaveLength(0);
    expect((await t.repo.getUser('other-1')).photo).toBeUndefined();
  });

  it('any active staff role can set its own photo', async () => {
    const t = makeTestApp();
    for (const role of ['responder', 'admin']) {
      const res = await put(t, t.as(role), PNG);
      expect(res.status).toBe(200);
      expect((await t.repo.getUser(`${role}-1`)).photo.url).toBe(res.body.photoUrl);
    }
  });
  it('limits profile uploads per signed-in account before reading another file', async () => {
    const t = makeTestApp();
    for (let i = 0; i < 10; i++) expect((await put(t, t.as('resident'), PNG)).status).toBe(200);
    const blocked = await put(t, t.as('resident'), PNG);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('rate_limited');
    expect(t.uploader.calls).toHaveLength(10);
    expect((await put(t, t.as('resident', 'another-resident'), PNG)).status).toBe(200);
    expect((await request(t.app).delete('/api/users/me/photo').set('Authorization', t.as('resident'))).status).toBe(200);
  });

});
