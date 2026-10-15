import multer from 'multer';
import { HttpError } from '../errors.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

const MESSAGES = {
  LIMIT_FILE_SIZE: ['photo_too_large', 'Photo exceeds 5 MB'],
  LIMIT_FILE_COUNT: ['too_many_photos', 'At most 5 photos allowed'],
  LIMIT_UNEXPECTED_FILE: ['unexpected_file', 'Photos must be sent in the "photos" field'],
};

export function uploadPhotos() {
  const m = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  }).array('photos', MAX_FILES);
  return (req, res, next) => m(req, res, (err) => {
    if (!err) return next();
    const mapped = err instanceof multer.MulterError ? MESSAGES[err.code] : null;
    if (mapped) return next(new HttpError(400, mapped[0], mapped[1]));
    if (err instanceof multer.MulterError) return next(new HttpError(400, 'invalid_upload', 'Invalid upload'));
    next(err);
  });
}
