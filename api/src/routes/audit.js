import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parseRange } from '../services/statsService.js';

export function auditRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Rows are returned exactly as stored.
  r.get('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const str = (v) => (typeof v === 'string' && v ? v : undefined);
      const { from, to } = parseRange(req.query);
      const filter = {
        reportId: str(req.query.reportId), actorUid: str(req.query.actorUid),
        action: str(req.query.action), from, to,
      };
      res.json(await deps.repo.listAudit(filter));
    } catch (e) { next(e); }
  });

  return r;
}
