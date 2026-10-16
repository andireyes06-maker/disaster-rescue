import { Router } from 'express';
import { requireAuth, requireIdentity, requireRole } from '../middleware/auth.js';
import { createStaff, updateStaff, registerSelf } from '../services/userService.js';

export function usersRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);
  const identity = requireIdentity(deps.verifyToken);

  r.post('/self', identity, async (req, res, next) => {
    try {
      const out = await registerSelf(deps, req.user, req.body ?? {});
      res.status(out.created ? 201 : 200).json({ uid: out.uid, role: out.role });
    } catch (e) { next(e); }
  });
  r.post('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.status(201).json(await createStaff(deps, req.body ?? {}, req.user)); } catch (e) { next(e); }
  });
  r.get('/', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.json(await deps.repo.listUsers()); } catch (e) { next(e); }
  });
  r.patch('/:id', auth, requireRole('dispatcher', 'admin'), async (req, res, next) => {
    try { res.json(await updateStaff(deps, req.params.id, req.body ?? {}, req.user)); } catch (e) { next(e); }
  });

  return r;
}
