import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../errors.js';
import { sanitizeText } from '../domain/validation.js';
import { randomUUID } from 'node:crypto';
import { mutationEffects, tryMutationEffects } from '../services/mutationEffectsService.js';

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
  r.post('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      const id = randomUUID();
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.create', after: { teamId: id, name } }]);
      await deps.repo.saveTeam(id, { name, busy: false, currentReportId: null, createdAt: new Date() }, effects);
      await tryMutationEffects(deps, effects);
      res.status(201).json({ id });
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      const before = await deps.repo.getTeam(req.params.id);
      if (!before) throw new HttpError(404, 'not_found', 'Team not found');
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.update', before: { name: before.name }, after: { teamId: req.params.id, name } }]);
      await deps.repo.saveTeam(req.params.id, { name }, effects);
      await tryMutationEffects(deps, effects);
      res.json({ id: req.params.id, name });
    } catch (e) { next(e); }
  });

  return r;
}
