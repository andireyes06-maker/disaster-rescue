import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as admin from '../services/adminService.js';

export function adminRouter(deps) {
  const r = Router();
  const adminOnly = requireRole('admin');
  const auth = requireAuth(deps.verifyToken);
  r.get('/health', auth, adminOnly, async (req, res, next) => {
    try { res.json(await admin.health(deps)); } catch (e) { next(e); }
  });
  r.get('/settings', auth, adminOnly, async (req, res, next) => {
    try { res.json(await admin.getSettings(deps)); } catch (e) { next(e); }
  });
  r.put('/settings', auth, adminOnly, async (req, res, next) => {
    try { res.json(await admin.saveSettings(deps, req.user.uid, req.body ?? {})); } catch (e) { next(e); }
  });
  return r;
}
