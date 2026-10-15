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
        resolve({ url, sizeBytes: file.buffer.length, mimeType: sniffImageType(file.buffer) });
      },
    );
    stream.end(file.buffer);
  });

  return { upload: (files) => Promise.all(files.map(uploadOne)) };
}
