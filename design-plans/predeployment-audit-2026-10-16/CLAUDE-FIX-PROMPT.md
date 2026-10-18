# Claude repair prompt

Copy the following prompt into Claude:

```text
Work in /Users/rien/Documents/FINAL_PROJECT. Address me as Airen.

Read design-plans/predeployment-audit-2026-10-16/AUDIT.md and its linked evidence before editing. This is an actual audit of revision e9c6426, not a generic checklist. Review the current git diff and HEAD; preserve concurrent work and reconcile any source drift before applying a finding.

I authorize implementing the verified repairs and their focused regression tests. The previous no-code restriction applied to the design/audit phase. Use this audit as the concrete repair specification; do not restart discovery or ask for another approval round for routine fixes. If a finding proves outdated or contradicted, show the evidence and update its status instead of forcing the change.

Preserve the approved web identity in design-plans/dashboard-concept-v11-final-web.png and mobile direction in design-plans/mobile-concept-v2-refined.png. Do not reopen the palette. Generated labels/pixels are not application data or proof of accessible behavior.

Read the Software Build Guidelines AGENTS.md and project-standards/README.md under /Users/rien/Downloads/Software Build Guidelines. Inventory available plugins/skills, read their applicable SKILL.md instructions, and use the relevant ones, especially Impeccable, accessibility, motion/reduced-motion/performance, responsive UI, native Flutter/Material guidance, security review, and React performance. Do not install or run unrelated plugins simply to check them off. Respect recorded holds and account permissions.

Repair in the audit's order:
1. Stale Firestore authorization, report/team assignment race, last-admin race, native semantics, sensitive draft ownership, and missing close/admin staff actions.
2. Submission truthfulness and idempotent recovery, atomic terminal updates/team release, public-map coordinate contract, usable staff invitations, and masked resident read failures.
3. Mobile incident selection, unclosable loading/error dialogs, Back/filter/draft preservation, field-level validation/focus, truthful admin role controls and pending states, current responder assignments, and native error recovery.
4. Explicit first-load/refresh/empty/error/success states and appropriately sized skeletons. Preserve authorized cached data honestly, retain layout/focus, use one useful loading announcement, and make reduced-motion skeletons static. Do not just add shimmer over broken state handling.
5. Shared motion behavior, native landscape fixes, audit events, bounded queries/exports, dependency advisory disposition, design-system completion, bundle boundaries, navigation/metadata, and relevant release records.

The audit's motion-selector theory was withdrawn: shadcn correctly maps data-open to Radix data-state. The reproduced problem is the same 0.95-scale entrance under reduced motion. Preserve working dialog focus return.

Treat the npm audit's 11 high dependency-tree entries as a reachability/remediation review, not 11 proven application exploits. Do not run npm audit fix --force or blindly downgrade Firebase/shadcn. Do not implement a Firestore transaction as though external Firebase Auth calls are atomic with it; use a recoverable coordination strategy where required.

Use isolated local demo services and synthetic accounts. Do not use live test accounts or production credentials/data, send real invitations, upload private photos, or send real push notifications. Do not stop or reset unrelated local services. Audit helpers/logs contain the local setup and known fixture limitations; the disabled upload adapter does not certify real upload delivery.

Run existing web/API/rules/Flutter suites and the attached defect probes after adding meaningful regressions. Browser-test every affected role and key states at desktop/phone widths, keyboard, 200% zoom, and reduced motion. Verify Flutter semantic actions and compact landscape; obtain actual emulator/device evidence before claiming native readiness. Test the full report → verify → assign → rescue → resolve → close flow and recovery failures. Use separate rule-test projects so cleanup cannot erase another session's fixtures.

Maintain a repair ledger by audit ID: fixed, verified, pending external evidence, or contradicted with proof. Attach screenshots/logs and the exact tested revision. Re-run relevant checks after material changes. Do not claim unperformed production, screen-reader, device, restore, alert, or performance checks passed.

Stop short of committing, pushing, deploying, changing live settings/accounts, or performing a production restore. When repairs and local checks are complete, give me an evidence-backed ready/not-ready assessment for the specific release scope. Separate native-only distribution blockers from web/shared-backend blockers. Leave external verification pending where access or configuration is unavailable; do not invent a pass or delay all independent repairs because of it.
```
