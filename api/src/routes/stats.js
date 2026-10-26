import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseFilters, teamSummary } from '../services/statsService.js';

export function statsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Aggregates only: no contact details, photos or locations.
  // Admin only: the web Analytics page is admin-only.
  r.get('/', auth, requireRole('admin'), async (req, res, next) => {
    try {
      const filters = parseFilters(req.query);
      res.json(buildStats(await loadReports(deps.repo, filters), filters));
    } catch (e) { next(e); }
  });

  // Responder's own team only. Returns no other team's counts.
  r.get('/team', auth, requireRole('responder'), async (req, res, next) => {
    try {
      const teamId = (await deps.repo.getUser(req.user.uid))?.team ?? null;
      if (!teamId) return res.json({ teamId: null, total: 0, open: 0, resolved: 0, byStatus: {}, peopleRescued: 0 });
      res.json({ teamId, ...teamSummary(await loadReports(deps.repo, {}), teamId) });
    } catch (e) { next(e); }
  });

  return r;
}
