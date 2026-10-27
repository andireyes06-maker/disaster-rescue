import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadPhotos } from '../middleware/upload.js';
import { create } from '../services/reportService.js';
import * as review from '../services/reviewService.js';
import * as assignment from '../services/assignmentService.js';
import { isSafeId } from '../domain/validation.js';

export function reportsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);
  // An id that cannot be a database document id (empty, or containing '/') is simply not a report.
  r.param('id', (req, res, next, id) => (isSafeId(id) ? next() : res.status(404).json({ error: 'not_found' })));
  // Keyed by signed-in user, so it must run after auth. Counts only residents' submissions.
  const submitLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user.uid,
    handler: (req, res) => res.status(429).json({ error: 'rate_limited' }),
  });
  // Per address, after sign-in and the resident check, so unauthenticated requests cannot use up a shared address's quota.
  // It still stops one address from spreading submissions across many accounts. Needs TRUST_PROXY=1 behind a proxy.
  const submitIpLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'rate_limited' }),
  });

  r.post('/', auth, requireRole('resident'), submitIpLimit, submitLimit, uploadPhotos(), async (req, res, next) => {
    try {
      const b = req.body ?? {};
      const input = {
        type: b.type, description: b.description, lat: b.lat, lng: b.lng, source: b.source, addressText: b.addressText,
        area: b.area, placeName: b.placeName, severity: b.severity, affectedRadiusM: b.affectedRadiusM,
      };
      if (b.contactName !== undefined || b.contactPhone !== undefined) {
        input.contact = { name: b.contactName ?? '', phone: b.contactPhone };
      }
      const observed = {};
      const out = await create(deps, req.user, input, req.files ?? [], req.get('Idempotency-Key'), observed);
      // The body keeps its shape. A replay of an already completed key says so in a header the browser is allowed to read.
      if (observed.replayed) res.set('Idempotent-Replayed', '1');
      res.status(201).json(out);
    } catch (e) { next(e); }
  });

  r.get('/', auth, async (req, res, next) => {
    try { res.json(await review.list(deps, req.user, req.query)); } catch (e) { next(e); }
  });
  r.get('/:id', auth, async (req, res, next) => {
    try { res.json(await review.get(deps, req.user, req.params.id)); } catch (e) { next(e); }
  });

  const patch = (path, role, fn) => r.patch(`/:id/${path}`, auth, requireRole(role), async (req, res, next) => {
    try { res.json(await fn(deps, req.user, req.params.id, req.body ?? {})); } catch (e) { next(e); }
  });
  patch('verify', 'admin', review.verify);
  patch('priority', 'dispatcher', review.setPriority);
  patch('classify', 'dispatcher', review.classify);
  patch('reject', 'dispatcher', review.reject);
  patch('duplicate', 'dispatcher', review.markDuplicate);
  patch('cancel', 'resident', review.cancel);
  patch('close', 'dispatcher', assignment.close);

  const post = (path, role, fn) => r.post(`/:id/${path}`, auth, requireRole(role), async (req, res, next) => {
    try { res.json(await fn(deps, req.user, req.params.id, req.body ?? {})); } catch (e) { next(e); }
  });
  post('assign', 'dispatcher', assignment.assign);
  post('acknowledge', 'responder', assignment.acknowledge);
  // Read-only: did the server record the update sent under this key? Never creates an update.
  r.get('/:id/updates/receipt', auth, requireRole('responder'), async (req, res, next) => {
    try { res.json(await assignment.findUpdateReceipt(deps, req.user, req.params.id, req.get('Idempotency-Key'))); } catch (e) { next(e); }
  });
  // The optional Idempotency-Key header lets a retried update after an uncertain reply replay its first result.
  r.post('/:id/updates', auth, requireRole('responder'), async (req, res, next) => {
    try { res.json(await assignment.addUpdate(deps, req.user, req.params.id, req.body ?? {}, req.get('Idempotency-Key'))); } catch (e) { next(e); }
  });

  return r;
}
