export function requireAuth(verifyToken) {
  return async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ error: 'missing_token' });
    let d;
    try { d = await verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
    if (!d?.uid) return res.status(401).json({ error: 'invalid_token' });
    if (d.active !== true) return res.status(403).json({ error: 'account_disabled' });
    req.user = { uid: d.uid, role: d.role ?? null, active: true };
    next();
  };
}
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'forbidden' });

// Verifies the token only. Used by POST /api/users/self, where a brand-new account
// has no role or active claims yet. Every other route keeps requireAuth (fails closed).
export function requireIdentity(verifyToken) {
  return async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ error: 'missing_token' });
    let d;
    try { d = await verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
    if (!d?.uid) return res.status(401).json({ error: 'invalid_token' });
    req.user = { uid: d.uid, email: d.email ?? null };
    next();
  };
}
