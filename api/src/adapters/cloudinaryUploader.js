import { v2 as cloudinary } from 'cloudinary';
import { sniffImageType } from '../domain/validation.js';

// Photos are stored with type "authenticated" (private delivery). The returned
// URL is signed, so it cannot be guessed from the public id alone.
// Uploads with pre-reserved ids (publicIds) never overwrite. A wait longer than UPLOAD_WAIT_MS is reported as an
// unknown outcome: the provider may still accept the file later, so the photo ledger keeps the id until cleanup
// reconciles it (domain/photoLedger.js, UPLOAD_DEADLINE_MS).
export const UPLOAD_WAIT_MS = 60_000;

export class UploadOutcomeUnknown extends Error {
  constructor(publicId) {
    super('photo upload outcome unknown (timed out)');
    this.name = 'UploadOutcomeUnknown';
    this.publicId = publicId;
  }
}

const withWait = (promise, ms, publicId) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new UploadOutcomeUnknown(publicId)), ms);
  timer.unref?.();
  promise.then(
    (v) => { clearTimeout(timer); resolve(v); },
    (e) => { clearTimeout(timer); reject(e); },
  );
});

export function createCloudinaryUploader({ cloudName, apiKey, apiSecret }) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const uploadOne = (file, publicId) => {
    const options = publicId
      ? { resource_type: 'image', type: 'authenticated', public_id: publicId, overwrite: false }
      : { resource_type: 'image', type: 'authenticated', folder: 'disaster-rescue' };
    const done = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error('empty upload result'));
        const url = cloudinary.url(result.public_id, {
          type: 'authenticated', sign_url: true, secure: true, resource_type: 'image', version: result.version,
          ...(result.format ? { format: result.format } : {}),
        });
        resolve({ publicId: result.public_id, url, sizeBytes: file.buffer.length, mimeType: sniffImageType(file.buffer) });
      });
      stream.end(file.buffer);
    });
    return publicId ? withWait(done, UPLOAD_WAIT_MS, publicId) : done;
  };

  async function remove(items) {
    await Promise.all((items ?? []).map(async (it) => {
      try {
        await cloudinary.uploader.destroy(it.publicId, { type: 'authenticated', resource_type: 'image', invalidate: true });
      } catch (e) {
        console.error('cloudinary destroy failed', it.publicId, e);
      }
    }));
  }

  // 'ok' when the asset was destroyed, 'not_found' when the provider has no such asset. Anything else throws, so the
  // ledger keeps the row for a later attempt.
  async function destroy(publicId) {
    const r = await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image', invalidate: true });
    if (r?.result === 'ok') return 'ok';
    if (r?.result === 'not found') return 'not_found';
    throw new Error(`unexpected destroy result for ${publicId}`);
  }

  async function upload(files, { publicIds } = {}) {
    if (publicIds && publicIds.length !== files.length) throw new Error('one reserved public id per photo is required');
    const results = await Promise.allSettled(files.map((f, i) => uploadOne(f, publicIds?.[i])));
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      await remove(results.filter((r) => r.status === 'fulfilled').map((r) => r.value));
      throw failed.reason;
    }
    return results.map((r) => r.value);
  }

  return { upload, remove, destroy };
}
