import { Router } from 'express';
import { attemptKey, lockState, nextAfterFailure } from '../domain/loginAttempts.js';
import { HttpError } from '../errors.js';

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

  return r;
}
