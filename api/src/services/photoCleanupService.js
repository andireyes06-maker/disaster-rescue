import { randomUUID } from 'node:crypto';

// Bounded cleanup of abandoned photos (design: PHOTO-CLEANUP-SPEC.md). Every decision that can lead to a destroy is made by
// the repo inside a transaction (claimPhotoAssetForCleanup). This worker only performs the provider call and records its result.
// Nothing here deletes by elapsed time alone: a row is leased only after the repo has shown that no winning report can reference it.
// Returns counts only (never asset ids): rows checked, provider destroy calls made, and the outcomes. `reconciling` is the
// backlog of rows the provider has not yet confirmed removed; it is kept, never expired (see FOLLOWUP-DECISIONS.md).
export async function drainPhotoCleanup({ repo, uploader }, { now = Date.now(), limit = 10, owner = randomUUID(), leaseMs = 60_000 } = {}) {
  const due = await repo.listDuePhotoAssets(now, limit);
  const counts = { destroyed: 0, checked: due.length, providerCalls: 0, notFound: 0, errors: 0 };
  for (const row of due) {
    const claimed = await repo.claimPhotoAssetForCleanup(row.assetId, { owner, now, leaseMs });
    if (!claimed) continue;
    let outcome;
    counts.providerCalls++;
    try {
      outcome = await uploader.destroy(claimed.assetId);
    } catch (error) {
      // The row stays pending with a retry time. Only the error name is logged, never a photo url or report data.
      console.error('photo cleanup destroy failed', claimed.assetId, error?.name ?? 'error');
      outcome = 'error';
    }
    await repo.finishPhotoAssetCleanup(claimed.assetId, owner, outcome, now);
    if (outcome === 'ok') counts.destroyed++;
    else if (outcome === 'not_found') counts.notFound++;
    else counts.errors++;
  }
  counts.reconciliation = await repo.summarizePhotoReconciliation(now);
  return counts;
}

export function startPhotoCleanupWorker(deps, { intervalMs = 60_000, limit = 10 } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const c = await drainPhotoCleanup(deps, { limit });
      // Operator visibility without identifiers: counts, ages and provider-call volume for reconciliation review.
      if (c.providerCalls > 0 || c.reconciliation.rows > 0) {
        console.info('photo cleanup run', JSON.stringify({
          checked: c.checked, providerCalls: c.providerCalls, destroyed: c.destroyed, notFound: c.notFound, errors: c.errors,
          reconcilingRows: c.reconciliation.rows, oldestReconcilingAgeMs: c.reconciliation.oldestAgeMs,
        }));
      }
    }
    catch (error) { console.error('photo cleanup unavailable', error.message); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
