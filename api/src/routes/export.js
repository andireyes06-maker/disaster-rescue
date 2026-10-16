import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseRange } from '../services/statsService.js';
import { toCsv, toPdf } from '../services/exportService.js';

// Exports carry exact location, so only the roles that already see it in the app get them.
export function exportRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);
  const staff = requireRole('dispatcher', 'dmo');
  // The summary holds totals only, so admins may download it. The incident CSV carries exact locations, so it stays with the roles that see them.
  const summaryRoles = requireRole('dispatcher', 'dmo', 'admin');

  r.get('/incidents.csv', auth, staff, async (req, res, next) => {
    try {
      const range = parseRange(req.query);
      const reports = await deps.repo.listReports(range);
      res.type('text/csv').attachment('incidents.csv').send(toCsv(reports));
    } catch (e) { next(e); }
  });

  r.get('/summary.pdf', auth, summaryRoles, async (req, res, next) => {
    try {
      const range = parseRange(req.query);
      const reports = await loadReports(deps.repo, range);
      const pdf = await toPdf(buildStats(reports, range), reports);
      res.type('application/pdf').attachment('summary.pdf').send(pdf);
    } catch (e) { next(e); }
  });

  return r;
}
