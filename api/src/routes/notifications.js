import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../errors.js';
import { isSafeId } from '../domain/validation.js';

const MAX_TOKEN_LENGTH = 1500;
const validToken = (token) => token.length <= MAX_TOKEN_LENGTH && /^[\x21-\x7e]+$/.test(token) && !token.includes('/') && !['.', '..'].includes(token) && !/^__.*__$/.test(token);

export function notificationsRouter(deps) {
  const r = Router();
  r.param('id', (req, res, next, id) => (isSafeId(id) ? next() : res.status(404).json({ error: 'not_found' })));
  r.param('token', (req, res, next, token) => (isSafeId(token) ? next() : res.status(404).json({ error: 'not_found' })));
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
      if (!validToken(token)) {
        throw new HttpError(400, 'invalid_token', `token must be 1 to ${MAX_TOKEN_LENGTH} characters`);
      }
      // A token already held by someone else is refused, so one user cannot redirect another's pushes.
      if (!(await deps.repo.claimDevice(req.user.uid, token))) {
        throw new HttpError(409, 'device_claimed', 'This device is registered to another account');
      }
      res.json({ registered: true });
    } catch (e) { next(e); }
  });

  // Sign-out: the owner removes their own token. Someone else's token looks missing (404).
  r.delete('/devices/:token', auth, async (req, res, next) => {
    try {
      if (!validToken(req.params.token)) throw new HttpError(400, 'invalid_token', 'Invalid device token');
      if (!(await deps.repo.removeDeviceOwned(req.user.uid, req.params.token))) {
        throw new HttpError(404, 'not_found', 'Device not found');
      }
      res.json({ removed: true });
    } catch (e) { next(e); }
  });

  return r;
}
