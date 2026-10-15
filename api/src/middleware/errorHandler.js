export function errorHandler(err, req, res, next) {
  if (err?.status) return res.status(err.status).json({ error: err.code, message: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
}
