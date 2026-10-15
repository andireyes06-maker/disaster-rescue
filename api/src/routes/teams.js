import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../errors.js';
import { sanitizeText } from '../domain/validation.js';

const teamName = (v) => {
  const n = typeof v === 'string' ? sanitizeText(v, 10000) : '';
  if (!n || n.length > 100) throw new HttpError(400, 'invalid_name', 'Name must be 1 to 100 characters');
  return n;
};

export function teamsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Team status (busy, currentReportId) reveals active rescues, so only staff who coordinate see it.
  r.get('/', auth, requireRole('dispatcher', 'dmo', 'admin'), async (req, res, next) => {
    try { res.json(await deps.repo.listTeams()); } catch (e) { next(e); }
  });
  r.post('/', auth, requireRole('dispatcher'), async (req, res, next) => {
    try {
      const id = await deps.repo.saveTeam(null, { name: teamName(req.body?.name), busy: false, currentReportId: null, createdAt: new Date() });
      res.status(201).json({ id });
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      if (!(await deps.repo.getTeam(req.params.id))) throw new HttpError(404, 'not_found', 'Team not found');
      await deps.repo.saveTeam(req.params.id, { name });
      res.json({ id: req.params.id, name });
    } catch (e) { next(e); }
  });

  return r;
}
