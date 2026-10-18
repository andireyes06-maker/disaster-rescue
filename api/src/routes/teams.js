import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../errors.js';
import { sanitizeText } from '../domain/validation.js';
import { record } from '../services/auditService.js';

const teamName = (v) => {
  const n = typeof v === 'string' ? sanitizeText(v, 10000) : '';
  if (!n || n.length > 100) throw new HttpError(400, 'invalid_name', 'Name must be 1 to 100 characters');
  return n;
};

// Team changes are audited like account changes. A failed audit write is logged and does not undo the change.
async function auditTeam(deps, caller, action, id, before, after) {
  try {
    await record(deps.repo, { actorUid: caller?.uid ?? null, action, reportId: undefined, before, after: { teamId: id, ...after } });
  } catch (e) {
    console.error('team audit write failed', e);
  }
}

export function teamsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Team status (busy, currentReportId) reveals active rescues, so only staff who coordinate see it.
  r.get('/', auth, requireRole('dispatcher', 'dmo', 'admin'), async (req, res, next) => {
    try { res.json(await deps.repo.listTeams()); } catch (e) { next(e); }
  });
  r.post('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      const id = await deps.repo.saveTeam(null, { name, busy: false, currentReportId: null, createdAt: new Date() });
      await auditTeam(deps, req.user, 'team.create', id, undefined, { name });
      res.status(201).json({ id });
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      const before = await deps.repo.getTeam(req.params.id);
      if (!before) throw new HttpError(404, 'not_found', 'Team not found');
      await deps.repo.saveTeam(req.params.id, { name });
      await auditTeam(deps, req.user, 'team.update', req.params.id, { name: before.name }, { name });
      res.json({ id: req.params.id, name });
    } catch (e) { next(e); }
  });

  return r;
}
