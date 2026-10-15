import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadPhotos } from '../middleware/upload.js';
import { create } from '../services/reportService.js';

export function reportsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  r.post('/', auth, requireRole('resident'), uploadPhotos(), async (req, res, next) => {
    try {
      const b = req.body ?? {};
      const input = {
        type: b.type, description: b.description, lat: b.lat, lng: b.lng, source: b.source, addressText: b.addressText,
      };
      if (b.contactName !== undefined || b.contactPhone !== undefined) {
        input.contact = { name: b.contactName ?? '', phone: b.contactPhone };
      }
      const out = await create(deps, req.user, input, req.files ?? []);
      res.status(201).json(out);
    } catch (e) { next(e); }
  });

  return r;
}
