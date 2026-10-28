# Codex full audit prompt: I-Report responder upgrade (commit 3c70a92)

Paste everything below the line into Codex.

---

You are auditing the I-Report responder upgrade. Read only; do not edit files, commit, push, deploy, or change Firebase, Vercel, or production data.

## Source
- Repository: /Users/rien/Documents/FINAL_PROJECT/app
- Branch: feat/ui-response-workspace-2026-10-28
- Audited commit: 3c70a92 (diff against ec3fc26)
- Run `git show --stat 3c70a92` first and confirm the HEAD matches. If it does not, stop and report.

## Scope
Web: web/src/features/responder/*, web/src/layout/AppShell.tsx, web/src/App.tsx, web/src/responder-workspace.css, web/src/workspace-usability.css.
Flutter: mobile/lib/features/report/photo_picker.dart, report_flow_page.dart, mobile/lib/data/services.dart, mobile/test/photo_picker_test.dart, mobile/test/report_flow_test.dart.
Rules and indexes: firebase/firestore.rules, firebase/firestore.indexes.json (two new composite indexes on reports: assignedTeamIds + status + createdAt ASC, and assignedTeamIds + status + updatedAt DESC).
Review record: design-plans/responder-web-audit-2026-10-28/ (read IMPLEMENTATION-REVIEW.md and FINISH-REVIEW.md first, then verify their claims rather than repeating them).

## What to check
1. Authorization: every responder Firestore query is limited to the signed-in team, and no path shows another team's report. Compare the client queries in useAssignedReports.ts, useClosedTeamReports.ts, watchTeamReports.ts and useOwnTeam.ts with firebase/firestore.rules. Note any query that the rules would refuse at runtime.
2. Data correctness: status filtering happens before limits; partial failures of the two team queries are shown, not hidden as an empty list; late callbacks from unsubscribed listeners are ignored; cached data is disclosed before any update control.
3. Idempotency and retries: a lost reply followed by a retry with the same key stores exactly one update. Check report update forms and the closed-draft receipt check (ClosedDraft in AssignmentsPage.tsx).
4. Camera and gallery (Flutter): capture and pick share validation and the five-photo limit; cancellation and permission failures keep existing photos; busy state blocks repeat taps; retry identity is preserved.
5. Accessibility: map pins (AssignmentMap.tsx) have a role and a name; disclosure buttons use aria-controls; live regions announce errors and status; focus moves correctly on route and detail changes.
6. Security: no secrets or credential values in the diff or the review folder; no unsafe HTML sinks (dangerouslySetInnerHTML, innerHTML with data).
7. Tests: confirm the test claims. Web: 560 tests across 75 files. Flutter: 278 tests and analyze clean. Run `cd web && npx vitest run --maxWorkers=2` and `npm run typecheck`, and `cd mobile && flutter analyze`. Report what you ran and the real output. Do not claim a test passed unless you ran it.

## Known limits (do not report these as new defects)
- The two Firestore indexes are not yet built in production. This is a deploy gate, not a code defect. Report whether the queries match the indexes exactly.
- Camera behavior on a real phone is not verified. Do not require an Android emulator.
- Impeccable detector was not available. Do not claim a detector pass.

## Output
Write the report to design-plans/responder-web-audit-2026-10-28/CODEX-AUDIT.md with:
- Findings ordered by severity, each with file:line, the failure scenario, and whether you confirmed it by reading or by running.
- A "Verified" section listing exactly what you ran and its result.
- A "Not checked" section.
- A one-line verdict: ready to deploy, ready after listed fixes, or not ready.
Do not print any credential values. Do not reproduce the contents of ~/.config or Downloads.
