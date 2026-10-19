// Pure decisions for idempotent report submission. Repositories call these inside the same transaction that reads the
// claim, so the fake repo and the Firestore adapter cannot disagree about the rules.
//
// A claim is one document per (account, Idempotency-Key). It is bound to an immutable content fingerprint and to a
// reserved report id and reference. A worker holds the claim with a generation number and a lease. A newer generation
// (taken over after the lease expires) fences the older worker, which must not commit.

// Action taken when a claim is read.
//   run      - this attempt owns the claim (new, or taken over after the lease expired)
//   replay   - the key already completed with the same content; return its stored result
//   pending  - another attempt holds a live lease
//   conflict - the key was used for different content (checked before any takeover)
//   unresolved - a legacy claim with no reserved report id, past its lease; it may already have created a report
export function decideClaim(stored, { fingerprint, now, reportId, reference, leaseMs }) {
  if (!stored) {
    const claim = { state: 'pending', fingerprint, reportId, reference, generation: 1, leaseUntilMs: now + leaseMs };
    return { mode: 'run', claim, generation: 1, reportId, reference };
  }
  // Content binding first, for every state. Expiry never permits rebinding a key to different content.
  if (stored.fingerprint !== fingerprint) return { mode: 'conflict' };
  if (stored.state === 'done') return { mode: 'replay', result: stored.result };
  if (!stored.reportId) {
    const legacyLive = now < (stored.startedAtMs ?? 0) + leaseMs;
    return legacyLive ? { mode: 'pending' } : { mode: 'unresolved' };
  }
  if (stored.leaseUntilMs > now) return { mode: 'pending' };
  const generation = (stored.generation ?? 0) + 1;
  const claim = { ...stored, generation, leaseUntilMs: now + leaseMs };
  return { mode: 'run', claim, generation, reportId: stored.reportId, reference: stored.reference };
}

// Decision inside the commit transaction, for the worker holding `generation`.
//   commit  - this worker still owns the claim; write the report and the completed claim together
//   replay  - the claim already completed (by this worker's earlier attempt or a winner); return its result
//   fenced  - the claim was taken over; this worker must not write
export function decideCommit(stored, generation) {
  if (stored?.state === 'done') return { mode: 'replay', result: stored.result };
  if (stored?.state === 'pending' && stored.generation === generation) return { mode: 'commit' };
  return { mode: 'fenced' };
}

// A worker that failed before committing gives its claim back at once, so an immediate retry can run.
export function decideRelease(stored, generation) {
  if (stored?.state === 'pending' && stored.generation === generation) {
    return { write: { ...stored, leaseUntilMs: 0 } };
  }
  return { write: null };
}
