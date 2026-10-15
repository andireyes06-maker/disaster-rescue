import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = { opts: [], fail: false, failAt: -1, urlCalls: [], destroyed: [], destroyFail: false };
vi.mock('cloudinary', () => {
  const cloudinary = {
    config: vi.fn(),
    uploader: {
      destroy: async (id, o) => { state.destroyed.push([id, o]); if (state.destroyFail) throw new Error('nope'); },
      upload_stream: (opts, cb) => {
        state.opts.push(opts);
        return { end: (buf) => {
          if (state.fail || state.opts.length === state.failAt) return cb(new Error('boom'));
          cb(null, { public_id: `pid${state.opts.length}`, version: 123, format: 'jpg', bytes: buf.length });
        } };
      },
    },
    uploader_destroy: null,
    url: (id, o) => { state.urlCalls.push([id, o]); return `https://res.cloudinary.com/x/image/authenticated/s--sig--/${id}`; },
  };
  return { v2: cloudinary, default: { v2: cloudinary } };
});

import { createCloudinaryUploader } from '../../src/adapters/cloudinaryUploader.js';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const cfg = { cloudName: 'c', apiKey: 'k', apiSecret: 's' };

beforeEach(() => { state.opts = []; state.fail = false; state.failAt = -1; state.urlCalls = []; state.destroyed = []; state.destroyFail = false; });

describe('cloudinary uploader', () => {
  it('uploads each file with type authenticated and returns signed urls', async () => {
    const out = await createCloudinaryUploader(cfg).upload([{ buffer: JPEG }, { buffer: JPEG }]);
    expect(state.opts).toHaveLength(2);
    for (const o of state.opts) expect(o).toMatchObject({ type: 'authenticated', resource_type: 'image' });
    expect(state.urlCalls).toHaveLength(2);
    for (const [, o] of state.urlCalls) expect(o).toMatchObject({ sign_url: true, type: 'authenticated', secure: true });
    expect(out).toEqual([
      { publicId: expect.any(String), url: expect.stringContaining('/authenticated/s--'), sizeBytes: JPEG.length, mimeType: 'image/jpeg' },
      { publicId: expect.any(String), url: expect.stringContaining('/authenticated/s--'), sizeBytes: JPEG.length, mimeType: 'image/jpeg' },
    ]);
  });
  it('rejects when an upload fails', async () => {
    state.fail = true;
    await expect(createCloudinaryUploader(cfg).upload([{ buffer: JPEG }])).rejects.toThrow('boom');
  });
  it('returns publicId on each descriptor for later removal', async () => {
    const out = await createCloudinaryUploader(cfg).upload([{ buffer: JPEG }]);
    expect(out[0].publicId).toBe('pid1');
  });
  it('one failing file out of five destroys the four that succeeded and rejects', async () => {
    state.failAt = 3;
    await expect(createCloudinaryUploader(cfg).upload(Array(5).fill({ buffer: JPEG }))).rejects.toThrow('boom');
    expect(state.destroyed).toHaveLength(4);
    for (const [, o] of state.destroyed) expect(o).toMatchObject({ type: 'authenticated', resource_type: 'image' });
  });
  it('remove destroys authenticated assets and never throws', async () => {
    state.destroyFail = true;
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(createCloudinaryUploader(cfg).remove([{ publicId: 'a' }, { publicId: 'b' }])).resolves.toBeUndefined();
    expect(state.destroyed.map(([id]) => id)).toEqual(['a', 'b']);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
