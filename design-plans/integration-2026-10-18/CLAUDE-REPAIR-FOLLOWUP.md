Continue in /private/tmp/rescue-release-integration-2026-10-18 on integration/redesign-functional-2026-10-18. The integration remains uncommitted on 76e54ff. Preserve both original worktrees and all current visual/motion work.

Read these first:
- /Users/rien/Documents/FINAL_PROJECT/design-plans/integration-2026-10-18/CODEX-REPAIR-REVIEW.md
- The codex-repair-review/probes.json and probes.mjs beside it.
- HANDOFF-REFRESH-REPAIR.md and IDEMPOTENCY-REPAIR-SPEC.md in that folder.

Fix R1–R3 with failing regressions first:
1. Do not automatically evict an unresolved retry key and POST an ambiguous payload under a new key. Capacity pressure needs safe resolution before sending. Test a server-accepted lost response, five other unconfirmed versions and retry of the original payload; assert no duplicate report.
2. Replace uid__key claim addressing with an unambiguous identity. Cover ownership-checked legacy handling, the two colliding pairs in the review, matching content and concurrent operations against the actual Firestore adapter. Preserve atomicity and fencing.
3. Handle failure to clear a confirmed key without silently replaying it for a later intentional send. Cover persist-then-clear-fails, remount/reload and other unresolved entries. Consume persisted=false in the form and accurately explain memory-only retry protection. Preserve privacy and focus.

Use the relevant testing/security/frontend skills. Do not weaken the atomic tests or regenerate golden images to hide regressions. Keep real emulator evidence separate from injected Storage/transport faults. Refresh handoff, overlay, patch and checksums after product changes. Report exactly which results you reran and any remaining gaps. No production actions, commit, push, merge or deployment.
