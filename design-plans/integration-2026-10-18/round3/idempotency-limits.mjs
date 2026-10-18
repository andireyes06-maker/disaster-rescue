// Reproduces the documented idempotency limits against the integration's real report service (in-memory repo, fake uploader).
// Case A: the completion write fails after the report is created; the client retries with the same key after the claim goes stale.
// Case B: a retry arrives while the first attempt is still pending, before the stale window ends.
import { createRequire } from 'node:module';
const W = '/private/tmp/rescue-release-integration-2026-10-18/api';
const { create, submissionFingerprint } = await import(`${W}/src/services/reportService.js`);
const { createMemoryRepo } = await import(`${W}/test/fakes/memoryRepo.js`);
const { createFakeUploader } = await import(`${W}/test/fakes/fakeUploader.js`);
const { parseReportInput } = await import(`${W}/src/domain/validation.js`);

const KEY = 'limit-key-0000000001';
const input = { type: 'flood', description: 'Idempotency limit check', lat: '14.5870', lng: '120.9720', source: 'gps' };
const user = { uid: 'resident-limit', role: 'resident' };
const notifier = { notifyRole: async () => {} };
const results = {};

// Controlled clock so the 120-second stale window can be crossed without waiting.
let clock = Date.now();
const realNow = Date.now;
Date.now = () => clock;

async function caseA() {
  const repo = createMemoryRepo();
  const uploader = createFakeUploader();
  const realComplete = repo.completeSubmission;
  let failNext = true;
  repo.completeSubmission = async (...args) => { if (failNext) { failNext = false; throw new Error('simulated completion-write failure'); } return realComplete(...args); };
  const deps = { repo, uploader, notifier };
  let first;
  try { first = await create(deps, user, input, [], KEY); } catch (e) { first = { error: e.message }; }
  const afterFailure = (await repo.listReports({})).length;
  clock += 121_000; // retry after the claim is older than STALE_MS (120 s)
  const retry = await create(deps, user, input, [], KEY);
  const stored = (await repo.listReports({})).length;
  results.caseA_staleRetryAfterCompletionFailure = { firstAttempt: first.error ?? 'created', reportsAfterFirst: afterFailure, retryReturned: retry.id, reportsStored: stored, duplicate: stored > 1 };
}

async function caseB() {
  const repo = createMemoryRepo();
  const deps = { repo, uploader: createFakeUploader(), notifier };
  // Simulate a first request that claimed the key and is still running.
  const fingerprint = submissionFingerprint(parseReportInput(input), []);
  await repo.claimSubmission(user.uid, KEY, { staleAfterMs: 120_000, fingerprint });
  let retry;
  try { retry = await create(deps, user, input, [], KEY); } catch (e) { retry = { error: e.code ?? e.message }; }
  results.caseB_retryWhilePending = { retryOutcome: retry.error ?? 'created', refused: Boolean(retry.error) };
}

try {
  await caseA();
  await caseB();
} finally {
  Date.now = realNow;
}
console.log(JSON.stringify(results, null, 2));
