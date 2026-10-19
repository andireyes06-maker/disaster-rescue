# Rescue Reports completion: audit findings F01–F10

Date: 2026-10-18. Status: **draft for approval**. Nothing here is built until Airen approves it.

## 1. Intent and source

The local full audit (`design-plans/full-audit-2026-10-18/AUDIT-REPORT.md`, frozen) found that the product is consistent but not release-ready. This pass repairs the confirmed defects F01–F10. It does not start a redesign and does not change the visual direction or normal motion.

Source: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, base `76e54ff` plus uncommitted changes. Verified identity at the start of this pass: 229 uncommitted entries, HEAD `76e54ff`. The original `FINAL_PROJECT` tree has independent edits and is out of scope. Other sessions' uncommitted work is preserved: edit only the files each fix needs, and read a file before changing it.

**Not in this pass:** commit, push, merge, deploy, production credentials, real Cloudinary/email/push/hosted-WebKit verification, owner hotline or privacy copy, abandoned-photo cleanup implementation (the spec stays `recovery/PHOTO-CLEANUP-SPEC.md`). The explicit "do not commit" instruction overrides the global rule to commit after each plan phase.

## 2. Decisions

Airen's decisions (from the question on 2026-10-18):

- **D1 (F05): audit-log access is dispatcher and admin only.** DMO loses audit reads in Firestore rules and rules tests, which matches the API and the existing navigation (DMO already has no Audit item).
- **D2 (F02): after an uncertain send, a restart does not silently retry.** Option B below.

My calls, flagged so they can be changed:

- **C1 (F02) photo identity:** SHA-256 of each photo's bytes, via the `crypto` package (new dependency, dart.dev). A changed photo of the same count gets a new key.
- **C2 (F02) restart state:** persist only a per-account boolean and timestamp, `uncertainSend`. No key, no text, no photo bytes are stored. The existing draft save is unchanged.
- **C3 (F04):** preserve edits made during Posting. Fields stay editable and no lock is applied. After success, only fields still equal to their submitted values are reset.
- **C4 (F09):** remove Assignments from the **admin** navigation. The `/assignments` route stays for responders, and the genuine "not linked to a team" recovery remains for responders.
- **C5 (F10):** show the latest 5 updates, newest first, with a button to reveal older updates in chronological order. Notes longer than a threshold collapse behind a disclosure. The Firestore query order stays unchanged.
- **C6 (F08) required marker:** the same convention as the web required fields (see the build step that reads `web/src/components/calm/Field.tsx` and `DESIGN.md`). Native required labels get the same marker and a screen-reader equivalent.

## 3. Permission matrix (F05)

One table governs every audit-like read. Rules, API, navigation and tests must all match it.

| Surface | resident | responder | dispatcher | dmo | admin |
|---|---|---|---|---|---|
| Audit log (`auditLogs`, `GET /audit`) | no | no | yes | **no (after fix)** | yes |
| Monitor page | no | no | no | yes | yes |
| Analytics page | no | no | yes | yes | yes |
| Aggregate stats API | no | yes | yes | yes | yes |

The audit row is the only policy change. Follow-up decision, 18 October 2026: Airen chose “Preserve current access” after review of the Monitor/Analytics differences. Dispatchers keep Dashboard/Map, responders keep Assignments, and responders retain aggregate API access. The corrected rows above describe distinct page and API permissions; no additional role pages are granted.

## 4. Per-finding design

### F01 — `/users` at phone width (`web/src/features/users/UsersPage.tsx`, `web/src/styles.css`)

- At widths below a phone breakpoint (640px), the management row stacks: identity on top, controls below.
- The team selector takes the full row width. Action buttons wrap rather than squeeze.
- Email and name use `min-width: 0` and `overflow-wrap: anywhere` so long values stay readable.
- Acceptance: a rendered check at 390px, with the production build serving the bundled Geist font, measuring the identity block width (must be at least 200px), row height bounded (not the 816px from the audit), and all buttons inside the viewport. Document overflow alone does not count.

### F02 — Flutter uncertain submission (`mobile/lib/features/report/report_flow_page.dart`, `submission_result_page.dart`, `report_draft_store.dart`)

Classification of the failure, mirroring the web client's `apiFailure` mapping:

- **Uncertain outcome** (status 0 network, any 5xx, 429, `submission_in_progress`, `submission_unresolved`): keep the key. Show the receipt copy: "We could not confirm your report was sent. Check My reports before sending it again."
- **Definite refusal** (other 4xx, including 400 validation): drop the key. Keep "Your report was NOT submitted."
- **`idempotency_conflict`**: drop the key, as the web does.

Identity:

- The signature is the canonical draft JSON plus the SHA-256 of each photo's bytes, in order. The current `photos.length` count is removed.
- Same signature → reuse the in-memory key. Changed content → new key.

Restart (option B):

- After an uncertain outcome, save `uncertainSend: true` for the account in the draft store, next to the existing draft.
- On restart, if the flag is set, the Submit action shows the "check My reports" message and is blocked. The message offers an explicit "I checked, send as a new report" action. That action clears the flag and generates a new key. It is the explicit replay resolution the web also uses.
- The flag clears on confirmed success, on draft discard, and on the explicit new-report action.
- No key, no text, and no photo bytes are persisted by this change.

Tests (desired behavior, replacing the observational probe's expectation):

- Injected 500 twice with unchanged content → both attempts send the same key.
- Changed photo bytes with the same count → different key.
- Receipt copy after 500 does not contain "NOT submitted" and does contain "could not confirm".
- Restart with `uncertainSend` set → submit blocked until the explicit action.
- Definite 400 → key dropped (regression for the existing behavior).

Evidence type: widget tests with fakes. Not device or live transport evidence.

### F03 — Staff notifications (`web/src/layout/AppShell.tsx`, `web/src/features/resident/NotificationBell.tsx`)

- Mount the existing bell in the staff shell header, for dispatcher, dmo, responder and admin, using the signed-in uid.
- Add a `reportHref` prop (default `/my/reports/:id`, staff `/incidents/:id`). The resident layout keeps its current link.
- Keep the Popover focus return, Escape handling, the 300ms enter / 160ms exit motion and the row stagger unchanged.
- Acceptance: a staff-role test that a notification link goes to `/incidents/:id` and the resident test still goes to `/my/reports/:id`; a rendered check of the bell in the staff shell at 390 and 1440.

### F04 — Responder Notes during Posting (`web/src/features/responder/OperationForm.tsx`)

- The submit button stays focusable with `aria-disabled` and `aria-busy` (already present); the existing `pending` ref keeps repeat activation guarded.
- On success, instead of `reset({ ...values, note: '' })`, reset only the fields whose current value still equals the submitted value. Fields edited during the request keep the newer text.
- Acceptance: a test with a deferred successful response. Type a new note while pending, resolve, and assert the new note survives. Assert the repeat activation sends one request.

### F05 — DMO audit permission (`firebase/firestore.rules`, `firebase/rules.test.js`, `api/src/routes/audit.js`, `web` route guard)

- Rules: `auditLogs` read becomes active dispatcher or admin. The `isStaff()` helper is left as is for other collections.
- `firebase/rules.test.js`: the case "dispatcher and dmo read" (around line 271) changes so DMO is denied. Add a matrix test that asserts each role of the table above, including resident and responder.
- API: already dispatcher and admin. Add an API test asserting the matrix for `GET /audit`.
- Web: verify DMO cannot reach `/audit` (nav omits it; confirm the route guard). Add a test.
- Exports: the audit export route is included in the matrix check. If it differs, it is a finding to report, not silently changed.

### F06 — Native operation status (`mobile/lib/features/responder/operation_form_page.dart`, `incident_detail_page.dart`)

- Mirror the web's `allowedOperationStatuses` as a Dart function: Team Assigned → Rescue in Progress only; Rescue in Progress → Rescue in Progress, Resolved; other statuses → no update.
- `IncidentDetailPage` passes the current report status. When the live status changes while the form is open, the selected status is re-validated.
- For a status with no valid transition, show a short "No status update is available for this report yet" state, not a form that fails on submit.
- Tests: Team Assigned never offers Resolved; Rescue in Progress offers both; a live status change moves the selection to a valid option. The API contract test (existing workflow) is the reference.

### F07 — Native release configuration (`mobile/lib/firebase_bootstrap.dart`, `mobile/lib/main.dart`)

- Extract a pure function `releaseConfigErrors(...)` that returns the list of violations. In release builds (`kReleaseMode`):
  - `API_BASE_URL` must be set explicitly, use `https`, and must not point to `10.0.2.2` or `localhost`.
  - `USE_EMULATORS` must be false.
  - The four Firebase values must be present.
- Remove the release fallback to `http://10.0.2.2:8080/api`. Debug builds keep the emulator default.
- Show a configuration error screen in release instead of starting with an unsafe host.
- Verification: unit tests for the function (no network). `flutter build` in release mode is run only if the Android/iOS toolchain exists locally; otherwise it is reported as not run. No live cleartext request is made.

### F08 — Required markers and touch targets

- Native: required labels (Register name/email/password, report type, description, location, contact fields that are required) get the required marker from C6. Optional fields (for example, phone) are not marked.
- Web: `PasswordInput` show/hide button and queue filter tabs reach 44px minimum height and width. This is the recommended comfort target, not an axe violation claim.
- Verification: a rendered measurement at 390px; a golden or widget test for the native label text.

### F09 — Admin Assignments dead end (`web/src/layout/AppShell.tsx`)

- Remove the admin Assignments nav item (C4). Responders keep it.
- Admins who open `/assignments` directly still see the existing "not linked" message, which is genuine for an account without a team.
- Acceptance: nav-by-role test for admin does not include Assignments; responder does.

### F10 — Recent activity scale (`web/src/features/reports/ResidentReportDetail*`, `web/src/features/incidents/IncidentDetails*`, `useReport.ts`)

- Keep the Firestore listener and its `orderBy('at','asc')` unchanged.
- Show the most recent 5 updates newest first. A "Show N older updates" button reveals the rest, placed above the recent block in chronological order.
- Notes over a length threshold show a clamped preview with a "Show full note" disclosure. Preserve the text exactly (no truncation of stored data).
- Acceptance: a test with 50 updates shows 5 by default, reveals all on the button, and does not lose text. A 390px rendered check bounds the page height for the 50-update fixture (the audit measured 25,474px / 28,735px before the change).

## 5. Dependency triage (separate phase, after F01–F10)

- Triage by context, not by count. The 11 high web entries come from two advisory families (`@grpc/grpc-js` and braces). The browser bundle does not use the gRPC server path. The braces maintainer disputes the practical risk.
- Forced major downgrades are not applied. Compatible patch and minor updates are applied only if the suite passes.
- Preserve the shadcn CSS build asset. Moving build-only tooling out of production dependencies is allowed only with a build check.
- Record each advisory with its disposition in the ledger.

## 6. Verification

Baseline (from the audit and recovery handoff): web 436; API 351 pass, 18 skipped; Firestore emulator adapters 17; rules 129; Flutter 128 with clean analysis.

Each fix gets a failing test first (TDD), then the fix, then:

- Web: the targeted test file, then the full web suite, `typecheck`, the production build.
- API: the matrix test, then the full API suite (expect 351 + new, 18 skipped).
- Rules: the Firestore emulator rules suite (expect 129 + new).
- Emulator adapter suite: 17.
- Flutter: `flutter analyze`, then `flutter test` (expect 128 + new).
- Rendered checks (Playwright, normal motion, axe, overflow, measured widths) at 390 and 1440 for F01, F03, F08, F09 and F10. Screenshots saved under a new evidence folder, not over the frozen audit evidence.

Reporting rule: mocked or fake-backed results are labeled as such. Emulator results are labeled emulator. Device and provider gates are not claimed.

## 7. Skills and how they apply

- `superpowers:test-driven-development` for each fix (failing test first).
- `superpowers:verification-before-completion` before any claim of done.
- `fixing-accessibility` for F03, F04, F08, F09 (focus, labels, targets).
- `fixing-motion-performance` for the F03 bell motion and F10 reveal, keeping normal motion.
- `security-review` for F02 restart state, F05 rules, F07 release configuration.
- `frontend-design` and `impeccable` are not used to redesign. They are only consulted if a layout choice is unclear, and that use is reported.
- No plugin is claimed as having run unless its output is recorded.

## 8. Out of scope and gates that stay open

Abandoned-photo cleanup, Cloudinary upload and lifecycle, non-production email and push delivery, hosted Firebase and WebKit, physical or simulator native rendering, owner-approved hotline and privacy wording, retention policy, and the release commit and configuration.

## 9. Ledger and handoff

After each phase: update `PAGE-LEDGER.md` for each affected surface, update the integration `HANDOFF.md` "Start here" (60 lines max), and regenerate the overlay, patch, manifest and checksums through the existing recovery process. Verify reconstruction. Do not overwrite the frozen audit evidence or claim the old screenshots show new code.
