// Cloudinary adapter with pre-reserved ids. The SDK is mocked: no network and no credentials.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const state = { opts: [], hang: false, destroyResult: { result: 'ok' }, destroyCalls: [] };
vi.mock('cloudinary', () => {
  const cloudinary = {
    config: vi.fn(),
    uploader: {
      destroy: async (id, o) => { state.destroyCalls.push([id, o]); return state.destroyResult; },
      upload_stream: (opts, cb) => {
        state.opts.push(opts);
        return { end: (buf) => { if (!state.hang) cb(null, { public_id: opts.public_id ?? 'pid-legacy', version: 1, format: 'jpg', bytes: buf.length }); } };
      },
    },
    url: (id) => `https://res.cloudinary.com/x/image/authenticated/s--sig--/${id}`,
  };
  return { v2: cloudinary, default: { v2: cloudinary } };
});

import { createCloudinaryUploader, UPLOAD_WAIT_MS } from '../../src/adapters/cloudinaryUploader.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const cfg = { cloudName: 'c', apiKey: 'k', apiSecret: 's' };

beforeEach(() => { state.opts = []; state.hang = false; state.destroyResult = { result: 'ok' }; state.destroyCalls = []; });
afterEach(() => { vi.useRealTimers(); });

describe('cloudinary adapter with reserved public ids', () => {
  it('uploads each photo under its reserved public id and refuses to overwrite', async () => {
    const out = await createCloudinaryUploader(cfg).upload([{ buffer: JPEG }], { publicIds: ['disaster-rescue/abc123' ] });
    expect(state.opts).toEqual([expect.objectContaining({ public_id: 'disaster-rescue/abc123', overwrite: false, type: 'authenticated', resource_type: 'image' })]);
    expect(state.opts[0]).not.toHaveProperty('folder');
    expect(out[0]).toMatchObject({ publicId: 'disaster-rescue/abc123', sizeBytes: JPEG.length, mimeType: 'image/jpeg' });
  });

  it('a list of reserved ids that does not match the photo count is refused before any upload starts', async () => {
    await expect(createCloudinaryUploader(cfg).upload([{ buffer: JPEG }, { buffer: JPEG }], { publicIds: ['disaster-rescue/one'] }))
      .rejects.toThrow('one reserved public id per photo is required');
    expect(state.opts).toHaveLength(0);
  });

  it('without reserved ids the original folder-based upload is unchanged', async () => {
    await createCloudinaryUploader(cfg).upload([{ buffer: JPEG }]);
    expect(state.opts[0]).toMatchObject({ folder: 'disaster-rescue', type: 'authenticated' });
    expect(state.opts[0]).not.toHaveProperty('public_id');
  });

  it('an upload that does not finish within the wait is reported as an unknown outcome, not as a failure', async () => {
    vi.useFakeTimers();
    state.hang = true;
    const pending = createCloudinaryUploader(cfg).upload([{ buffer: JPEG }], { publicIds: ['disaster-rescue/slow'] });
    const settled = pending.then(() => 'ok', (e) => e);
    await vi.advanceTimersByTimeAsync(UPLOAD_WAIT_MS + 1);
    const err = await settled;
    expect(err).toMatchObject({ name: 'UploadOutcomeUnknown', publicId: 'disaster-rescue/slow' });
  });
});

describe('cloudinary adapter destroy outcomes', () => {
  it('destroy reports ok when the asset was removed', async () => {
    expect(await createCloudinaryUploader(cfg).destroy('disaster-rescue/a')).toBe('ok');
    expect(state.destroyCalls[0]).toEqual(['disaster-rescue/a', expect.objectContaining({ type: 'authenticated', resource_type: 'image' })]);
  });

  it('destroy reports not_found as its own outcome, distinct from ok', async () => {
    state.destroyResult = { result: 'not found' };
    expect(await createCloudinaryUploader(cfg).destroy('disaster-rescue/b')).toBe('not_found');
  });

  it('destroy with any other result throws instead of reporting success', async () => {
    state.destroyResult = { result: 'error' };
    await expect(createCloudinaryUploader(cfg).destroy('disaster-rescue/c')).rejects.toThrow('unexpected destroy result');
  });
});
