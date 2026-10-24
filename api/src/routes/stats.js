import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseFilters } from '../services/statsService.js';

export function statsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Aggregates only: no contact details, photos or locations.
  // Admin only: the web Analytics page is admin-only and no responder or mobile screen calls this route.
  r.get('/', auth, requireRole('admin'), async (req, res, next) => {
    try {
      const filters = parseFilters(req.query);
      res.json(buildStats(await loadReports(deps.repo, filters), filters));
    } catch (e) { next(e); }
  });

  return r;
}
