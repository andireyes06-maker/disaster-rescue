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
      // A token already held by someone else is refused, so one user cannot redirect another's pushes.
      const owner = await deps.repo.getDeviceOwner(token);
      if (owner && owner !== req.user.uid) throw new HttpError(409, 'device_claimed', 'This device is registered to another account');
      await deps.repo.addDevice(req.user.uid, token);
      res.json({ registered: true });
    } catch (e) { next(e); }
  });

  // Sign-out: the owner removes their own token. Someone else's token looks missing (404).
  r.delete('/devices/:token', auth, async (req, res, next) => {
    try {
      if ((await deps.repo.getDeviceOwner(req.params.token)) !== req.user.uid) {
        throw new HttpError(404, 'not_found', 'Device not found');
      }
      await deps.repo.removeDevice(req.params.token);
      res.json({ removed: true });
    } catch (e) { next(e); }
  });

  return r;
}
