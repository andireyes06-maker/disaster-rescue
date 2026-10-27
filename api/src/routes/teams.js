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

// A team's headquarters: a fixed point used to rank teams by distance from a report.
const headquarters = (v) => {
  if (v === undefined || v === null) return null;
  const lat = Number(v?.lat), lng = Number(v?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpError(400, 'invalid_hq', 'Headquarters need a valid latitude and longitude');
  }
  return { lat, lng };
};

export function teamsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  // Team status (busy, currentReportId) reveals active rescues, so only staff who coordinate see it.
  r.get('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.json(await deps.repo.listTeams()); } catch (e) { next(e); }
  });
  r.post('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const name = teamName(req.body?.name);
      const hq = headquarters(req.body?.hq);
      const id = randomUUID();
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.create', after: { teamId: id, name, hq } }]);
      await deps.repo.saveTeam(id, { name, hq, busy: false, currentReportId: null, createdAt: new Date() }, effects);
      await tryMutationEffects(deps, effects);
      res.status(201).json({ id });
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const hasName = req.body?.name !== undefined;
      const hasHq = req.body?.hq !== undefined;
      if (!hasName && !hasHq) throw new HttpError(400, 'nothing_to_update', 'Send name and/or hq');
      const name = hasName ? teamName(req.body.name) : undefined;
      const hq = hasHq ? headquarters(req.body.hq) : undefined;
      const before = await deps.repo.getTeam(req.params.id);
      if (!before) throw new HttpError(404, 'not_found', 'Team not found');
      const patch = { ...(hasName ? { name } : {}), ...(hasHq ? { hq } : {}) };
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.update', before: { name: before.name, hq: before.hq ?? null }, after: { teamId: req.params.id, ...patch } }]);
      await deps.repo.saveTeam(req.params.id, patch, effects);
      await tryMutationEffects(deps, effects);
      res.json({ id: req.params.id, ...(hasName ? { name } : {}), ...(hasHq ? { hq } : {}) });
    } catch (e) { next(e); }
  });

  return r;
}
