import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildStats, loadReports, parseFilters } from '../services/statsService.js';
import { toCsv, toPdf } from '../services/exportService.js';

// Exports carry exact location, so only the roles that already see it in the app get them.
export function exportRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);
  // Both exports carry exact locations (the summary lists each incident), so only the roles that see them in the app get them.
  const staff = requireRole('dispatcher', 'dmo');

  // Demo workspace exports are named and labeled as sample output, so they cannot pass for operational data.
  const demoLabel = async () => {
    const demo = await deps.repo.getDemoConfig();
    return demo?.active ? demo : null;
  };

  r.get('/incidents.csv', auth, staff, async (req, res, next) => {
    try {
      const range = parseFilters(req.query);
      const reports = await deps.repo.listReports(range);
      const demo = await demoLabel();
      res.type('text/csv').attachment(demo ? 'demo-sample-incidents.csv' : 'incidents.csv').send(toCsv(reports));
    } catch (e) { next(e); }
  });

  r.get('/summary.pdf', auth, staff, async (req, res, next) => {
    try {
      const range = parseFilters(req.query);
      const reports = await loadReports(deps.repo, range);
      const demo = await demoLabel();
      const pdf = await toPdf(buildStats(reports, range), reports, { sampleLabel: demo?.label ?? null });
      res.type('application/pdf').attachment(demo ? 'demo-sample-summary.pdf' : 'summary.pdf').send(pdf);
    } catch (e) { next(e); }
  });

  return r;
}
