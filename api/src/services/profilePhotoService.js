import { HttpError } from '../errors.js';
import { sniffImageType } from '../domain/validation.js';

const MAX_BYTES = 5 * 1024 * 1024;

// Asset removal is best effort: a failure is logged and never undoes the saved change. Both the real uploader
// and the test fake support remove([{ publicId }]); the real one also swallows per-asset errors.
async function removeAsset(uploader, publicId) {
  if (!publicId) return;
  try {
    await uploader.remove([{ publicId }]);
  } catch (e) {
    console.error('profile photo asset removal failed', publicId, e);
  }
}

// The bytes decide the type: the filename and the client's mimetype are never trusted.
function checkPhoto(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new HttpError(400, 'photo_required', 'Choose a photo to upload');
  if (file.buffer.length === 0) throw new HttpError(400, 'invalid_photo', 'Photo is empty');
  if (file.buffer.length > MAX_BYTES) throw new HttpError(400, 'photo_too_large', 'Photo exceeds 5 MB');
  if (!sniffImageType(file.buffer)) throw new HttpError(400, 'invalid_photo', 'Photo must be JPEG, PNG or WebP');
}

// Upload first, then save, then remove the previous asset. A failed upload leaves everything as it was;
// a failed save removes the new upload so no orphan is left; the old asset goes only once the new one is saved.
export async function setPhoto({ repo, uploader }, uid, file) {
  checkPhoto(file);
  const user = await repo.getUser(uid);
  if (!user) throw new HttpError(404, 'not_found', 'Account not found');
  const previous = user.photo?.publicId ?? null;
  const [uploaded] = await uploader.upload([file]);
  const photo = { publicId: uploaded.publicId, url: uploaded.url, updatedAt: new Date() };
  try {
    await repo.updateUser(uid, { photo });
  } catch (e) {
    await removeAsset(uploader, uploaded.publicId);
    throw e;
  }
  if (previous && previous !== photo.publicId) await removeAsset(uploader, previous);
  return { photoUrl: photo.url };
}

// Clears the field first, then removes the asset. Removing when there is no photo is a no-op.
export async function removePhoto({ repo, uploader }, uid) {
  const user = await repo.getUser(uid);
  if (!user) throw new HttpError(404, 'not_found', 'Account not found');
  const previous = user.photo?.publicId ?? null;
  if (user.photo != null) await repo.updateUser(uid, { photo: null });
  await removeAsset(uploader, previous);
  return { photoUrl: null };
}
