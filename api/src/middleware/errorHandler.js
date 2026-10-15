import { HttpError } from '../errors.js';

const isClientStatus = (s) => Number.isInteger(s) && s >= 400 && s <= 499;

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError && isClientStatus(err.status)) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  if (!(err instanceof HttpError) && isClientStatus(err?.status)) {
    return res.status(err.status).json({ error: 'bad_request' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
}
