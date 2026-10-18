# Recovery continuation — October 18, 2026

Airen, this supersedes HANDOFF-REFRESH-FOLLOWUP.md for current implementation state. The integration remains uncommitted on base 76e54ff at `/private/tmp/rescue-release-integration-2026-10-18`. Nothing committed, pushed, merged or deployed. Original product sources were preserved.

## Completed

1. **Durable report-creation audit/bell recovery.** A small `reportEffects/{reportId}` job is written atomically with the report (batch for no-key creation; transaction for keyed submission). Inline delivery runs immediately, and the API starts a bounded worker at startup and every 10 seconds. Due work is leased for 60 seconds, with ownership checked on completion. Failed work stays recoverable after restart. Audit and bell entries use deterministic create-once IDs; retry does not reset a read notification. Jobs contain category/reference and operational IDs, not report descriptions/contact details/photos.
2. **Transient push handling.** The FCM adapter now propagates transient per-token failures instead of treating the batch as complete. Durable delivery opts into strict notification errors. Existing other workflows retain best-effort error behavior. Permanently invalid device tokens remain removable. Push is at-least-once: acknowledgement loss, partial success, or lease takeover can duplicate a push. Real provider delivery is still unverified.
3. **Firefox reload/lost-reply coverage.** The installed Playwright 1.63 client is compatible with the existing Firefox build and supports interception. Four checks pass: emulator sign-in, real POST accepted then injected lost reply, reload retry with the original key plus explicit replay resolution, API read-back with exactly one report. No browser download/install was needed.

Implementation: `api/src/domain/reportEffects.js`, `services/reportEffectsService.js`, Firestore/memory repos, report service, notifier, FCM adapter, server startup and repo port. Tests cover startup/polling, fault recovery, worker fencing, read preservation, transient push handling and client denial of job access.

## Evidence

All new evidence is under `recovery/`.

- API full suite: **351 pass, 18 skipped**. Skips include emulator-only files; these are not failures or provider evidence.
- Real Firestore emulator suites: **17/17** (13 existing submission/identity + 4 recovery). Final strengthened recovery-only run: **4/4**.
- Separate API startup process: committed a report without running inline follow-up, then started the actual server in a separate process on port 3107 with project `demo-recovery-runtime`. The startup worker recovered exactly one audit and one bell notification. That process was stopped afterwards. No other stack was stopped/restarted.
- Web: **436/436**, typecheck clean, ordinary production build passes.
- Firestore rules: **129/129**, including all client roles denied read/list/write of recovery jobs.
- Firefox: **4/4**, Playwright 1.63, normal motion enabled, local integration stack only.
- Source diff check clean. Recovery source/patch/archive identity and restoration check recorded beside this handoff.

Injected faults: notification write reply loss, commit reply/process-read failure, provider transient errors and browser response loss. Real evidence: Firestore transactions/leases, persistence, actual separate-server startup, and Firefox API read-back. Cloudinary/FCM delivery was not exercised.

Initial checks exposed a missing batch implementation in the test Firestore double; the double now validates a whole batch before applying its writes. A sandbox-denied API suite was rerun with local-socket permission. These initial failures remain in the evidence; final runs are named accordingly. New recovery tests were observed failing before implementation; the transient-push regression failed before its adapter fix.

## Scope and remaining limits

- Recovery is for **new report creation**. Other incident transitions still use existing best-effort side effects. Existing historical reports without jobs are not automatically backfilled.
- Jobs/claims currently have no TTL; no retention policy or deletion was invented.
- The poller requires a running API instance. Suspended hosts recover on next startup; there is no external scheduler/dead-letter console yet. Lease retries are bounded per poll, without an operator dashboard.
- Worker retries protect audit/in-app identity, not exactly-once push delivery. A no-device/no-current-recipient event can complete without sending a push; active dispatcher/admin membership is evaluated when work is delivered.
- **Abandoned-upload cleanup is not implemented.** `recovery/PHOTO-CLEANUP-SPEC.md` gives the required ownership and late-upload protections. A real Cloudinary account is still needed for provider verification.
- Hosted WebKit, email/push delivery, physical mobile/Flutter rendering and owner-approved hotline/settings remain open. Flutter was unchanged and not rerun in this continuation. No reduced-motion audit was run.
- Firefox tested the already-running integration API and live frontend for retry behavior; the new server startup/recovery code was verified separately on 3107 and the emulator, not silently substituted under the existing 3106 process. Restart the integration through its launcher when choosing to preview the current server code.

## Next

Read the cleanup spec and implement ownership-safe abandoned asset reconciliation with regressions before claiming that gate closed. Then verify actual non-production uploads/delivery/hosted/device behavior when configuration exists. Preserve the current UI and retry resolution flow. Use the refreshed archive/checksums rather than pre-recovery/pre-followup/pre-repair artifacts. No commit or deployment authorization is granted here.
