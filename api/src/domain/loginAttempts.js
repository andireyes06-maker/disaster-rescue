import { createHash } from 'node:crypto';

// Failed sign-ins are counted per email. After MAX_FAILED_ATTEMPTS failures the email is locked for LOCKOUT_MS.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 5 * 60 * 1000;

// The count is per email AND client address, so one attacker from one address cannot lock a person out from elsewhere.
// The stored key is a hash, so the document never holds the email or the address itself.
export function attemptKey(email, ip) {
  const pair = `${String(email).trim().toLowerCase()}|${String(ip ?? 'unknown')}`;
  return createHash('sha256').update(pair).digest('hex');
}

// Whether the email is locked right now, and for how long.
export function lockState(record, now) {
  const until = record?.lockedUntil ?? 0;
  if (until > now) return { locked: true, retryAfterSeconds: Math.ceil((until - now) / 1000) };
  return { locked: false, retryAfterSeconds: 0 };
}

// The record after one more failed sign-in. An expired lock starts a fresh count.
export function nextAfterFailure(record, now) {
  // Only a lock that has actually ended restarts the count. A record with no lock (lockedUntil 0) keeps counting.
  const lockEnded = (record?.lockedUntil ?? 0) > 0 && record.lockedUntil <= now;
  const count = (lockEnded ? 0 : (record?.count ?? 0)) + 1;
  if (count >= MAX_FAILED_ATTEMPTS) return { count: 0, lockedUntil: now + LOCKOUT_MS };
  return { count, lockedUntil: 0 };
}
