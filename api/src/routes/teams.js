import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../errors.js';
import { sanitizeText } from '../domain/validation.js';
import { randomUUID } from 'node:crypto';
import { mutationEffects, tryMutationEffects } from '../services/mutationEffectsService.js';

// The identity a team responds under, shown beside its name. Existing teams without one count as Rescue.
export const TEAM_KINDS = ['PNP', 'BFP', 'Rescue', 'MDDRMO', 'Other'];
const teamKind = (v) => {
  if (v === undefined || v === null || v === '') return 'Rescue';
  if (!TEAM_KINDS.includes(v)) throw new HttpError(400, 'invalid_kind', 'Choose PNP, BFP, Rescue, MDDRMO or Other');
  return v;
};

const teamName = (v) => {
  const n = typeof v === 'string' ? sanitizeText(v, 10000) : '';
  if (!n || n.length > 100) throw new HttpError(400, 'invalid_name', 'Name must be 1 to 100 characters');
  return n;
};

// The headquarters' approximate place name, for display only. Never coordinates. Cleared when there is none.
const hqNameOf = (v) => (typeof v === 'string' && v.trim() ? sanitizeText(v, 120) : null);

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
      const kind = teamKind(req.body?.kind);
      const hq = headquarters(req.body?.hq);
      const id = randomUUID();
      const hqName = hq ? hqNameOf(req.body?.hqName) : null;
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.create', after: { teamId: id, name, hq } }]);
      await deps.repo.saveTeam(id, { name, kind, hq, hqName, busy: false, currentReportId: null, createdAt: new Date() }, effects);
      await tryMutationEffects(deps, effects);
      res.status(201).json({ id });
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try {
      const hasName = req.body?.name !== undefined;
      const hasHq = req.body?.hq !== undefined;
      const hasKind = req.body?.kind !== undefined;
      if (!hasName && !hasHq && !hasKind) throw new HttpError(400, 'nothing_to_update', 'Send name, kind and/or hq');
      const name = hasName ? teamName(req.body.name) : undefined;
      const kind = hasKind ? teamKind(req.body.kind) : undefined;
      const hq = hasHq ? headquarters(req.body.hq) : undefined;
      const before = await deps.repo.getTeam(req.params.id);
      if (!before) throw new HttpError(404, 'not_found', 'Team not found');
      const patch = { ...(hasName ? { name } : {}), ...(hasKind ? { kind } : {}), ...(hasHq ? { hq, hqName: hq ? hqNameOf(req.body.hqName) : null } : {}) };
      const effects = mutationEffects([{ actorUid: req.user.uid, action: 'team.update', before: { name: before.name, hq: before.hq ?? null }, after: { teamId: req.params.id, ...patch } }]);
      await deps.repo.saveTeam(req.params.id, patch, effects);
      await tryMutationEffects(deps, effects);
      res.json({ id: req.params.id, ...(hasName ? { name } : {}), ...(hasHq ? { hq } : {}) });
    } catch (e) { next(e); }
  });

  return r;
}
