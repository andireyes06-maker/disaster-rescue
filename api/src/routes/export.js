import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseRange } from '../services/statsService.js';
import { toCsv, toPdf } from '../services/exportService.js';

// Exports carry exact location, so only the roles that already see it in the app get them.
export function exportRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);
  // Both exports carry exact locations (the summary lists each incident), so only the roles that see them in the app get them.
  const staff = requireRole('dispatcher', 'dmo');

  r.get('/incidents.csv', auth, staff, async (req, res, next) => {
    try {
      const range = parseRange(req.query);
      const reports = await deps.repo.listReports(range);
      res.type('text/csv').attachment('incidents.csv').send(toCsv(reports));
    } catch (e) { next(e); }
  });

  r.get('/summary.pdf', auth, staff, async (req, res, next) => {
    try {
      const range = parseRange(req.query);
      const reports = await loadReports(deps.repo, range);
      const pdf = await toPdf(buildStats(reports, range), reports);
      res.type('application/pdf').attachment('summary.pdf').send(pdf);
    } catch (e) { next(e); }
  });

  return r;
}
