import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireIdentity, requireRole } from '../middleware/auth.js';
import { createStaff, updateStaff, registerSelf } from '../services/userService.js';
import { isSafeId } from '../domain/validation.js';
import { userView } from '../domain/userView.js';
import { uploadProfilePhoto } from '../middleware/upload.js';
import { setPhoto, removePhoto } from '../services/profilePhotoService.js';

export function usersRouter(deps) {
  const r = Router();
  r.param('id', (req, res, next, id) => (isSafeId(id) ? next() : res.status(404).json({ error: 'not_found' })));
  const auth = requireAuth(deps.verifyToken);
  const identity = requireIdentity(deps.verifyToken);
  // Count authenticated attempts by account, before multipart parsing/provider work.
  const photoLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user.uid,
    handler: (_req, res) => res.status(429).json({ error: 'rate_limited' }),
  });

  // Self-service routes take no id: the account is always the caller's, so another account cannot be named.
  // They are registered before any /:id route so "me" is never read as an id.
  r.get('/me', auth, async (req, res, next) => {
    try {
      const user = await deps.repo.getUser(req.user.uid);
      if (!user) return res.status(404).json({ error: 'not_found' });
      res.json(userView({ ...user, uid: req.user.uid }));
    } catch (e) { next(e); }
  });
  r.put('/me/photo', auth, photoLimit, uploadProfilePhoto(), async (req, res, next) => {
    try { res.json(await setPhoto(deps, req.user.uid, req.file)); } catch (e) { next(e); }
  });
  r.delete('/me/photo', auth, async (req, res, next) => {
    try { res.json(await removePhoto(deps, req.user.uid)); } catch (e) { next(e); }
  });

  r.post('/self', identity, async (req, res, next) => {
    try {
      const out = await registerSelf(deps, req.user, req.body ?? {});
      res.status(out.created ? 201 : 200).json({ uid: out.uid, role: out.role });
    } catch (e) { next(e); }
  });
  r.post('/', auth, requireRole('admin'), async (req, res, next) => {
    try { res.status(201).json(await createStaff(deps, req.body ?? {}, req.user)); } catch (e) { next(e); }
  });
  r.get('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.json(await deps.repo.listUsers()); } catch (e) { next(e); }
  });
  // An administrator opens the profile of the account that submitted a report. Same shape as /me, no internals.
  r.get('/:id', auth, requireRole('admin'), async (req, res, next) => {
    try {
      const user = await deps.repo.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'not_found' });
      res.json(userView({ ...user, uid: req.params.id }));
    } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.json(await updateStaff(deps, req.params.id, req.body ?? {}, req.user)); } catch (e) { next(e); }
  });

  return r;
}
