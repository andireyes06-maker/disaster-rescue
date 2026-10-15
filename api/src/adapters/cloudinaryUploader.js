import { v2 as cloudinary } from 'cloudinary';
import { sniffImageType } from '../domain/validation.js';

// Photos are stored with type "authenticated" (private delivery). The returned
// URL is signed, so it cannot be guessed from the public id alone.
export function createCloudinaryUploader({ cloudName, apiKey, apiSecret }) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const uploadOne = (file) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', type: 'authenticated', folder: 'disaster-rescue' },
      (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error('empty upload result'));
        const url = cloudinary.url(result.public_id, {
          type: 'authenticated', sign_url: true, secure: true, resource_type: 'image', version: result.version,
          ...(result.format ? { format: result.format } : {}),
        });
        resolve({ publicId: result.public_id, url, sizeBytes: file.buffer.length, mimeType: sniffImageType(file.buffer) });
      },
    );
    stream.end(file.buffer);
  });

  async function remove(items) {
    await Promise.all((items ?? []).map(async (it) => {
      try {
        await cloudinary.uploader.destroy(it.publicId, { type: 'authenticated', resource_type: 'image', invalidate: true });
      } catch (e) {
        console.error('cloudinary destroy failed', it.publicId, e);
      }
    }));
  }

  async function upload(files) {
    const results = await Promise.allSettled(files.map(uploadOne));
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      await remove(results.filter((r) => r.status === 'fulfilled').map((r) => r.value));
      throw failed.reason;
    }
    return results.map((r) => r.value);
  }

  return { upload, remove };
}
