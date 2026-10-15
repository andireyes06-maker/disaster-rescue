import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = { opts: [], fail: false, urlCalls: [] };
vi.mock('cloudinary', () => {
  const cloudinary = {
    config: vi.fn(),
    uploader: {
      upload_stream: (opts, cb) => {
        state.opts.push(opts);
        return { end: (buf) => {
          if (state.fail) return cb(new Error('boom'));
          cb(null, { public_id: `pid${state.opts.length}`, version: 123, format: 'jpg', bytes: buf.length });
        } };
      },
    },
    url: (id, o) => { state.urlCalls.push([id, o]); return `https://res.cloudinary.com/x/image/authenticated/s--sig--/${id}`; },
  };
  return { v2: cloudinary, default: { v2: cloudinary } };
});

import { createCloudinaryUploader } from '../../src/adapters/cloudinaryUploader.js';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const cfg = { cloudName: 'c', apiKey: 'k', apiSecret: 's' };

beforeEach(() => { state.opts = []; state.fail = false; state.urlCalls = []; });

describe('cloudinary uploader', () => {
  it('uploads each file with type authenticated and returns signed urls', async () => {
    const out = await createCloudinaryUploader(cfg).upload([{ buffer: JPEG }, { buffer: JPEG }]);
    expect(state.opts).toHaveLength(2);
    for (const o of state.opts) expect(o).toMatchObject({ type: 'authenticated', resource_type: 'image' });
    expect(state.urlCalls).toHaveLength(2);
    for (const [, o] of state.urlCalls) expect(o).toMatchObject({ sign_url: true, type: 'authenticated', secure: true });
    expect(out).toEqual([
      { url: expect.stringContaining('/authenticated/s--'), sizeBytes: JPEG.length, mimeType: 'image/jpeg' },
      { url: expect.stringContaining('/authenticated/s--'), sizeBytes: JPEG.length, mimeType: 'image/jpeg' },
    ]);
  });
  it('rejects when an upload fails', async () => {
    state.fail = true;
    await expect(createCloudinaryUploader(cfg).upload([{ buffer: JPEG }])).rejects.toThrow('boom');
  });
});
