import multer from 'multer';
import { HttpError } from '../errors.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

const MESSAGES = {
  LIMIT_FILE_SIZE: ['photo_too_large', 'Photo exceeds 5 MB'],
  LIMIT_FILE_COUNT: ['too_many_photos', 'At most 5 photos allowed'],
  LIMIT_FIELD_COUNT: ['too_many_fields', 'Too many report fields'],
  LIMIT_FIELD_VALUE: ['field_too_large', 'A report field is too large'],
  LIMIT_PART_COUNT: ['too_many_parts', 'Too many report fields or photos'],
  LIMIT_UNEXPECTED_FILE: ['unexpected_file', 'Photos must be sent in the "photos" field'],
};

const PROFILE_MESSAGES = {
  ...MESSAGES,
  LIMIT_FILE_COUNT: ['too_many_photos', 'Send one profile photo'],
  LIMIT_FIELD_COUNT: ['too_many_fields', 'Too many form fields'],
  LIMIT_FIELD_VALUE: ['field_too_large', 'A form field is too large'],
  LIMIT_PART_COUNT: ['too_many_parts', 'Too many form fields or photos'],
  LIMIT_UNEXPECTED_FILE: ['unexpected_file', 'The photo must be sent in the "photo" field'],
};

function mapErrors(m, messages) {
  return (req, res, next) => m(req, res, (err) => {
    if (!err) return next();
    const mapped = err instanceof multer.MulterError ? messages[err.code] : null;
    if (mapped) return next(new HttpError(400, mapped[0], mapped[1]));
    // Malformed multipart bodies (for example a truncated form) fail inside the parser, not as a
    // multer limit. They are the client's fault, so they get a 400 rather than an internal error.
    return next(new HttpError(400, 'invalid_upload', 'Invalid upload'));
  });
}

export function uploadPhotos() {
  const m = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 16, fieldSize: 8 * 1024, fieldNameSize: 100, parts: 16 + MAX_FILES },
  }).array('photos', MAX_FILES);
  return mapErrors(m, MESSAGES);
}

// One profile photo in the "photo" field, same 5 MB limit and error mapping as report photos.
// A request with no file passes through; the route answers 400 photo_required.
export function uploadProfilePhoto() {
  const m = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 4, fieldSize: 1024, fieldNameSize: 100, parts: 5 },
  }).single('photo');
  return mapErrors(m, PROFILE_MESSAGES);
}
