export const WEBSITE_RETIRED_ROLES = Object.freeze(['dispatcher', 'dmo']);

export function requireAuth(verifyToken) {
  return async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ error: 'missing_token' });
    let d;
    try { d = await verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
    if (!d?.uid) return res.status(401).json({ error: 'invalid_token' });
    if (d.active !== true) return res.status(403).json({ error: 'account_disabled' });
    // Professor clarification (2026-10-23): dispatcher and DMO accounts keep their records but have no API access.
    if (WEBSITE_RETIRED_ROLES.includes(d.role)) return res.status(403).json({ error: 'website_access_disabled' });
    req.user = { uid: d.uid, role: d.role ?? null, active: true };
    next();
  };
}
// Admins hold every staff permission. A route that lists only 'resident' stays resident-only.
export const grants = (roles, role) => roles.includes(role) || (role === 'admin' && roles.some((r) => r !== 'resident'));
export const requireRole = (...roles) => (req, res, next) =>
  grants(roles, req.user?.role) ? next() : res.status(403).json({ error: 'forbidden' });

// Verifies the token only. Used by POST /api/users/self, where a brand-new account
// has no role or active claims yet. Every other route keeps requireAuth (fails closed).
export function requireIdentity(verifyToken) {
  return async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ error: 'missing_token' });
    let d;
    try { d = await verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
    if (!d?.uid) return res.status(401).json({ error: 'invalid_token' });
    // Same website rule as requireAuth: retired staff roles get no API access, not even self-registration.
    if (WEBSITE_RETIRED_ROLES.includes(d.role)) return res.status(403).json({ error: 'website_access_disabled' });
    req.user = { uid: d.uid, email: d.email ?? null, emailVerified: d.emailVerified === true };
    next();
  };
}
