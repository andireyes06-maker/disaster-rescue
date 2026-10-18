# Repair ledger for the predeployment audit (base revision e9c6426)

For Airen. Working tree on `build/disaster-rescue`, uncommitted. Nothing pushed, deployed, or applied to live settings.

Status key: **FIXED** = change made and automated regression passes. **VERIFIED-PROBE** = the audit's own probe no longer reproduces the defect. **PENDING** = not started. **PENDING-EXTERNAL** = needs real service, device, or account evidence that this environment cannot provide. **CONTRADICTED** = evidence shows the finding does not hold.

## Batch 1: authorization and core invariants (P1)

| ID | Status | Change | Evidence |
|---|---|---|---|
| BE01 | FIXED | `firebase/firestore.rules`: active state, role, and team are read from the canonical `users/{uid}` document. A token whose claims disagree with the document reads nothing; a missing document denies. | `firebase/rules.test.js`: 127 pass (6 new stale-claim cases; claim tests now seed matching documents). Audit probe `security-probes.mjs` now fails with `permission-denied` at the stale-token read, which is the required outcome. |
| BE02 | FIXED | `repo.applyReportChange`: the report status change, the team claim, and the update record commit in one transaction. Two reports racing for one team: one succeeds, one gets `team_busy`. | `api/test/routes/assignment.test.js` (BE02 block, 3 new); `api/test/adapters/firestoreRepo.test.js` (3 new). Audit probe `backend-probes.mjs` BE-02 assertion now rejects the second assignment. |
| BE03 | FIXED | Resolution, its note, and its team release commit together through `applyReportChange`. | `api/test/routes/assignment.test.js` BE03 block: an injected write failure leaves the report unchanged with no update record; retry succeeds once. Audit probe BE-03 injected into the retired path and no longer applies; the regression above replaces it. |
| BE07 | FIXED (partial recovery) | `repo.setStaffGuarded`: last-admin check and write in one transaction. The canonical document is written first, then Auth. `authSyncPending` marks an Auth failure for retry. | `api/test/routes/admin-users.test.js`: concurrent cross-admin removal gives 200 and 409 with one admin left; failed Auth update leaves the flag and a retry completes it. **Residual:** `api/src/middleware/auth.js` still trusts token claims, so a failed Auth step can leave an old, unrevoked token accepted by the API until it expires. Documented, not fixed. |
| BE04 | FIXED | `publicIncidentService` reads the canonical nested `location`. | `api/test/routes/public.test.js`: fixtures corrected; new end-to-end test creates, verifies, and reads the public map. |
| W01 | FIXED | Shared workflow offers Close for Resolved reports; full report page and preview both expose it. | `web/src/features/reports/workflow.test.ts`; `ReportQueue` and `IncidentDetails` tests pass. Full lifecycle in a live browser: not yet run. |
| W02 | FIXED | `canActOnReports` (dispatcher and admin) replaces the dispatcher-only check on the queue and full report page. DMO stays read-only. | `workflow.test.ts`; `ReportQueue.test.tsx` admin case. Browser check of admin actions: not yet run. |
| W05 | FIXED | Resident detail separates first-load, failed read, and missing report; Retry on failure; failed refresh keeps the last good history. | `ResidentReportDetail.test.tsx`: 3 new cases. |
| M01 | FIXED | Hotline and category controls carry an explicit semantic tap action. | `mobile/test/semantic_actions_test.dart`. Confirmed: removing the tap action makes the test fail (`Expected: true, Actual: <false>`). Real TalkBack/VoiceOver activation: not tested. |
| M02 | FIXED | Draft key includes the signed-in uid (`report_draft_v2:<uid>`); no signed-in account means no save or load; legacy ownerless key deleted. | `mobile/test/draft_store_test.dart`: cross-account, signed-out, and legacy cases. |
| M03 | FIXED | Draft cleanup after a confirmed send runs in its own guard and cannot show "not sent". | `mobile/test/report_flow_test.dart` M03 case (cleanup throws, confirmation still shown). |
| M04 | FIXED (client and server replay) | `Idempotency-Key` on `POST /api/reports`: first claim creates, a completed key replays the result, an in-flight key gets 409 `submission_in_progress`, abandoned claims expire after 2 minutes. Mobile reuses one 128-bit key per attempt across network retries and resets it when the content changes. Offline copy no longer says "not sent". | `api/test/routes/reports.create.test.js` M04 block (4 new); `mobile/test/report_flow_test.dart` (same key on retry). **Residual:** if `completeSubmission` fails after the report is created, the key stays pending until it expires; a retry after expiry can create a duplicate. Documented, not fixed. |
| M05 | FIXED | Responder detail subscribes to the live report: status updates appear, and a removed or refused record hides the details and disables actions. | `mobile/test/responder_detail_live_test.dart`: 4 cases. |
| M06 | FIXED | Map lays out side by side in landscape and uses a height-limited share in portrait. | `mobile/test/map_layout_test.dart` at 640×320, 360×640, 900×400. |

| W04 | FIXED | Assign-team dialog keeps Close (and Try again after a load error) in every state that doesn't show the form. | `AssignTeamDialog.test.tsx`: 2 new cases (failed load; load that never answers). |
| W07 | FIXED | Dialog and select zoom and slide animations are behind `motion-safe:`; opacity fades remain. Built CSS verified to gate the 0.95 scale on `prefers-reduced-motion: no-preference`. | Build output checked. Browser run under reduced motion: not yet done. |
| W09 | FIXED | Resident report form: each error is linked to its field (`aria-invalid`, `aria-describedby`), a summary links to fields, and focus moves to the first invalid field. Values are kept. | `ReportForm.test.tsx`: 2 new cases (invalid submit with focus; half-filled contact pair). Screen-reader pass: not done. |
| W12 | FIXED (partly) | Resident navigation marks the current page (`NavLink`), a skip link is added, and the browser title follows the page. | Resident tests pass. Keyboard and screen-reader pass: not done. |
| W15 | FIXED | Public title, description, and theme colour in `web/index.html`. Route titles already set by the staff shell and resident layout. | Build passes. Header policy and CSP: still open (see below). |
| W16 | FIXED | Quick-view chips raised to the 44px touch target. | CSS token change. Measured in a browser: not yet done. |
| BE05 | FIXED | Account creation and role or activation changes write an audit entry with actor, target, and before/after values. No passwords, tokens, or contact details. | `api/test/routes/admin-users.test.js`: 1 new case. |

| W03 | FIXED | On phones, choosing a report moves focus to its preview heading (after it renders), so the detail is in view. Live list updates never move focus. | Browser check at 390px: after selecting the last row, focus is on `preview-title` at 408px from the top. |
| W06 | FIXED (first-load states) | Shared accessible skeleton (one status message per region, decorative shapes hidden, static under reduced motion). Used for the inbox, resident reports, notifications, and the public map frame (320px reserved). Notifications no longer show "none yet" before the first answer. | `ResidentDashboard.test.tsx` loading case; `ReportQueue` loading test. Stale and offline states, and the analytics chart skeleton: not done. |
| W08 | FIXED (filters, quick view, selection, search) | Quick view, filters, search, and the selected report live in the URL (replace, not push). Back and reload restore them. | Browser check: after opening a report and pressing Back, `?quick=verify&sel=audit-8` returns and the quick view stays pressed. Scroll position restore: not done. |
| W10 | FIXED (warning only) | Resident report form warns on reload or tab close while it has entries, and says entries are not saved on the device. No attachments or contact details are stored (no retention policy is approved). In-app navigation guard: not done (the app has no data router for `useBlocker`). | `ReportForm.test.tsx` beforeunload case. |
| W11 | FIXED | Role changes are staged and sent only on Save; each account shows its real role (`resident` shown as resident); requests have pending guards; refusals (last admin, own account, admin role) get specific messages. | `AdminPage.test.tsx`: staged-save test and a row-display test. |
| W13 | PARTIAL | Search added over real report fields (type, description, place, reference). Other design items not done: the masthead summary is a white strip, detail labels are still uppercase, the sidebar selected style and the per-route composition were not compared side by side with the reference. | `ReportQueue.test.tsx` search case. Side-by-side screenshots: not done. |
| W14 | FIXED (measured bundle) | Admin and audit pages are lazy (the ineffective import warning is gone). Vendor chunks split: entry 136 kB (was 547 kB), firestore 396 kB, firebase auth 155 kB, maps 164 kB, react 247 kB; no chunk-size warning. | `vite build` output. Transfer and speed on a real connection: not measured. |

## Batch status at the end of this pass

- Automated suites at the latest pass: API **270** passed, web **243** passed, rules **127** passed (isolated project `demo-rules-unit`), Flutter **121** passed, Flutter analyzer clean. Web production build passes with no chunk-size warning.
- Audit probes: `security-probes.mjs` now fails at the stale-claim read (defect no longer reproduces). `backend-probes.mjs` now rejects the second concurrent assignment (BE02 no longer reproduces); its BE-03 step targets a retired code path and is replaced by the regression above.
- Still not done: BE06 (bounded queries and exports), BE08 (invitations), W06 stale/offline states, W08 scroll restore, W10 in-app navigation guard, W13 design completion, M07–M09, M11, M12, D01 dependency review, M10 signing (external), and browser checks for most changes above (screen-reader, reduced-motion, 200% zoom).
- Nothing committed, pushed, deployed, or applied to live settings.


## Remaining Priority 1 items

| ID | Status | Notes |
|---|---|---|
| BE08 | PENDING | Staff invitations. Needs a provider-generated setup link and a delivery path. No real invitation may be sent in this audit. |
| M10 | PENDING-EXTERNAL | Release signing needs a protected keystore that is not in source. The debug-signing build can be made to fail without one. |

## Priority 2 and 3

All remaining items are PENDING unless listed here. Not started: BE06, BE08, M07–M09, M11, M12, dependency review D01, and release gates.
