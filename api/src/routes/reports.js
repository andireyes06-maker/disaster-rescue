import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadPhotos } from '../middleware/upload.js';
import { create } from '../services/reportService.js';
import * as review from '../services/reviewService.js';
import * as assignment from '../services/assignmentService.js';

export function reportsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  r.post('/', auth, requireRole('resident'), uploadPhotos(), async (req, res, next) => {
    try {
      const b = req.body ?? {};
      const input = {
        type: b.type, description: b.description, lat: b.lat, lng: b.lng, source: b.source, addressText: b.addressText,
      };
      if (b.contactName !== undefined || b.contactPhone !== undefined) {
        input.contact = { name: b.contactName ?? '', phone: b.contactPhone };
      }
      const out = await create(deps, req.user, input, req.files ?? []);
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
  patch('verify', 'dispatcher', review.verify);
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
  post('updates', 'responder', assignment.addUpdate);

  return r;
}
