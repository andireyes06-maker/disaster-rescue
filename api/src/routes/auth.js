import { Router } from 'express';
import { attemptKey, lockState, nextAfterFailure } from '../domain/loginAttempts.js';
import { HttpError } from '../errors.js';
import { createHmac } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';

const EMAIL_MAX = 254;

// The lockout key for this email and address, keyed with the server secret.

function emailFrom(body) {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > EMAIL_MAX || !email.includes('@')) throw new HttpError(400, 'invalid_email', 'Enter an email address');
  return email;
}

// Sign-in lockout. The website asks before each sign-in, reports each failure, and clears the count after a
// successful sign-in. Counts are per email and are stored by hash.
export function authRouter(deps) {
  const r = Router();

  // Whether this email is locked right now. Answers the same way for any email, registered or not.
  r.post('/sign-in/check', async (req, res, next) => {
    try {
      const record = await deps.repo.getLoginAttempt(attemptKey(emailFrom(req.body), req.ip, deps.loginAttemptSecret));
      res.json(lockState(record, Date.now()));
    } catch (e) { next(e); }
  });

  // Records one failed sign-in and returns the lock state after it.
  r.post('/sign-in/failure', async (req, res, next) => {
    try {
      const key = attemptKey(emailFrom(req.body), req.ip, deps.loginAttemptSecret);
      const record = await deps.repo.mutateLoginAttempt(key, (current) => nextAfterFailure(current, Date.now()));
      res.json(lockState(record, Date.now()));
    } catch (e) { next(e); }
  });

  // Clears the count. Needs a valid token, so nobody can clear another person's lock without the password.
  r.post('/sign-in/success', async (req, res, next) => {
    try {
      const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
      if (!m) return res.status(401).json({ error: 'missing_token' });
      let d;
      try { d = await deps.verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
      if (!d?.uid || !d.email) return res.status(401).json({ error: 'invalid_token' });
      await deps.repo.mutateLoginAttempt(attemptKey(d.email, req.ip, deps.loginAttemptSecret), () => null);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // A person who cannot reset their password asks for help here. Always answers the same way, registered or not.
  // Per address, at most 5 requests in 15 minutes; a request is ignored while one is open, and a closed one cannot be reopened for a day.
  const helpLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'rate_limited' }),
  });
  const HELP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  r.post('/reset-help', helpLimit, async (req, res, next) => {
    try {
      const email = emailFrom(req.body).toLowerCase();
      const key = createHmac('sha256', deps.loginAttemptSecret).update(email).digest('hex');
      const now = Date.now();
      await deps.repo.mutatePasswordHelp(key, (current) => {
        if (current && (current.status === 'open' || now - new Date(current.closedAt ?? 0).getTime() < HELP_COOLDOWN_MS)) return current;
        return { email, status: 'open', createdAt: new Date(now) };
      });
      res.status(202).json({ ok: true });
    } catch (e) { next(e); }
  });

  // Open help requests, for administrators only. The administrator sends the reset email from the website.
  const auth = requireAuth(deps.verifyToken);
  const admin = requireRole('admin');
  r.get('/reset-help', auth, admin, async (req, res, next) => {
    try {
      const rows = await deps.repo.listPasswordHelp();
      res.json(rows.map((x) => ({ id: x.id, email: x.email, createdAt: x.createdAt })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
    } catch (e) { next(e); }
  });

  r.post('/reset-help/:id/close', auth, admin, async (req, res, next) => {
    try {
      const at = new Date();
      await deps.repo.closePasswordHelp(req.params.id, req.user.uid, at);
      // Closing a request is an administrator action, so it is recorded in the audit log as well.
      await deps.repo.addAudit({ actorUid: req.user.uid, action: 'password-help.close', at, target: { requestId: req.params.id } });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
