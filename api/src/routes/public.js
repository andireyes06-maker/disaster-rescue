import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listPublicIncidents } from '../services/publicIncidentService.js';

export function publicRouter(deps) {
  const r = Router();
  // No sign-in is needed, so limit by address. 60 requests a minute per caller.
  const publicLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'rate_limited' }),
  });
  r.get('/incidents', publicLimit, async (req, res, next) => {
    try { res.json({ incidents: await listPublicIncidents(deps) }); } catch (e) { next(e); }
  });
  return r;
}
