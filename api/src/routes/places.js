import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function placesRouter({ verifyToken, placeLookup }) {
  const router = Router();
  router.get('/reverse', requireAuth(verifyToken), requireRole('admin', 'responder'), async (req, res, next) => {
    const { lat, lng } = req.query;
    const latitude = typeof lat === 'string' && lat.trim() ? Number(lat) : NaN;
    const longitude = typeof lng === 'string' && lng.trim() ? Number(lng) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return res.status(400).json({ error: 'invalid_location' });
    try { res.json({ placeName: await placeLookup(latitude, longitude), approximate: true, attribution: '© OpenStreetMap contributors' }); }
    catch (error) { next(error); }
  });
  return router;
}
