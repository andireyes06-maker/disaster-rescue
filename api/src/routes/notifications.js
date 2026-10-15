import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../errors.js';

const MAX_TOKEN_LENGTH = 4096;

export function notificationsRouter(deps) {
  const r = Router();
  const auth = requireAuth(deps.verifyToken);

  r.get('/notifications', auth, async (req, res, next) => {
    try { res.json(await deps.repo.listNotifications(req.user.uid)); } catch (e) { next(e); }
  });

  r.patch('/notifications/:id/read', auth, async (req, res, next) => {
    try {
      // Not owned by the caller looks the same as missing: 404, so ids do not leak.
      if (!(await deps.repo.markRead(req.params.id, req.user.uid))) {
        throw new HttpError(404, 'not_found', 'Notification not found');
      }
      res.json({ id: req.params.id, read: true });
    } catch (e) { next(e); }
  });

  r.post('/devices', auth, async (req, res, next) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      if (!token || token.length > MAX_TOKEN_LENGTH) {
        throw new HttpError(400, 'invalid_token', `token must be 1 to ${MAX_TOKEN_LENGTH} characters`);
      }
      await deps.repo.addDevice(req.user.uid, token);
      res.json({ registered: true });
    } catch (e) { next(e); }
  });

  return r;
}
