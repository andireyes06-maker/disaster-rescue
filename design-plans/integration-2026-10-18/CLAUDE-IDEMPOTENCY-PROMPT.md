Implement the report retry repair described in:
/Users/rien/Documents/FINAL_PROJECT/design-plans/integration-2026-10-18/IDEMPOTENCY-REPAIR-SPEC.md

First read HANDOFF-REFRESH-ROUND3.md and round3/ROUND3.md in that folder. Work only in /private/tmp/rescue-release-integration-2026-10-18 on integration/redesign-functional-2026-10-18. Verify HEAD and dirty state before editing; the combined work is uncommitted on 76e54ff. Preserve both original worktrees.

The reproduced completion-write/expiry duplicate is the priority. Make report creation plus claim completion atomic, retain immutable content binding and reserved report identity, and fence stale workers. Include legacy pending-claim handling and losing-upload cleanup. Do not merely remove the timeout or swallow the completion error.

Retain retry keys across same-tab reloads without storing raw report/contact/location/photo data. Use stable actual-content digests, not File object identity. Preserve unsaved-navigation protection, all frontend styling, normal motion, icon errors, required marks and focus behavior. The spec defines how to test ambiguous retries, edits, account switches and unavailable storage.

Also make Flutter golden tests self-contained with reviewed tracked references under mobile/test/goldens and provenance. Do not regenerate references to make regressions pass or claim old goldens certify the current design.

Use relevant installed testing/security/frontend skills, report which were actually used, and run the spec's acceptance checks plus full affected suites. Separate injected failures from real emulator persistence evidence. Refresh the handoff and regenerate the durable source overlay/patch/hashes after changes; the earlier archive is pre-repair.

Keep Cloudinary/email/push/hosted WebKit/device/hotline gates explicit. No production actions, commit, push, deployment or changes to other stacks. Finish with exact changes, results and remaining limits.
