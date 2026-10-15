import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseRange } from '../services/statsService.js';

export function statsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Aggregates only: no contact details, photos or locations.
  r.get('/', auth, requireRole('dispatcher', 'dmo', 'responder', 'admin'), async (req, res, next) => {
    try {
      const range = parseRange(req.query);
      res.json(buildStats(await loadReports(deps.repo, range), range));
    } catch (e) { next(e); }
  });

  return r;
}
