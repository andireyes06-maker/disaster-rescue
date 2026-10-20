# Rescue Reports completion (F01–F10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair audit findings F01–F10 in the integration worktree with failing-test-first changes, rendered evidence where layout matters, and no commits.

**Architecture:** Five disjoint workstreams run in parallel in the same worktree, each owning its files only: web staff UI (W1, W2), web responder/history (W3), rules/API/audit (W4), Flutter report submission (M1), Flutter responder/bootstrap (M2). Each workstream runs its own tests. A final integration pass runs the full suites and rendered checks.

**Tech Stack:** React + Vite + TypeScript + Vitest (web), Express + Node test (API), Firebase rules + emulator (firebase/), Flutter/Dart (mobile), Playwright for rendered checks.

**Spec:** `docs/superpowers/specs/2026-10-18-rescue-completion-design.md` (approved). Decisions D1, D2 and calls C1–C6 are binding.

## Global Constraints

- Source: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, base `76e54ff` plus uncommitted work. Do not touch the `FINAL_PROJECT` tree.
- No `git commit`, `git push`, merge or deploy. Other sessions' uncommitted changes stay as they are: read a file before editing it, and edit only the lines your task needs.
- Normal motion only. Do not disable motion to make a test pass.
- No new visual direction. No new hotline, privacy or retention copy. No production credentials.
- Dependencies: only the Flutter `crypto` package (F02). No npm major downgrades.
- Baseline before work: web 436 tests; API 351 pass + 18 skipped; Firestore emulator adapters 17; rules 129; Flutter 128 with clean analyze.
- Each fix: write the failing test first, run it and see it fail, then implement, then rerun.

## Review Focus

1. **Very long names and emails in one staff row at 390px** — identity stays readable and the row height is bounded (F01 test: `UsersPage.team.test.tsx` and rendered check).
2. **Same photo count, different photo bytes** — gets a new submission key (F02 test: `report_flow_test`, fake repository records keys).
3. **Uncertain 500 followed by an app restart** — submit is blocked until the explicit "send as new report" action (F02 test: draft-store restart case).
4. **Note typed while a responder save is pending, then success arrives** — the new text survives (F04 test: deferred promise).
5. **DMO reads the audit log directly or through the API** — denied in both, and the rules matrix covers every role (F05 test: `rules.test.js` matrix, API `GET /audit` matrix).

## File Map

| Workstream | Files |
|---|---|
| W1 (web layout) | `web/src/features/users/UsersPage.tsx`, `web/src/features/users/UsersPage.team.test.tsx`, `web/src/styles.css` (management block only), `web/src/components/PasswordInput.tsx` and test, queue filter tab markup/CSS in `web/src/features/dashboard/*` |
| W2 (staff shell) | `web/src/layout/AppShell.tsx`, `web/src/layout/AppShell.test.tsx`, `web/src/features/resident/NotificationBell.tsx` and test, `web/src/features/resident/notifications.css` (only if a new hook is needed) |
| W3 (responder/history) | `web/src/features/responder/OperationForm.tsx` and test, `web/src/features/reports/ResidentReportDetail*`, `web/src/features/incidents/IncidentDetails*` and tests, `web/src/features/reports/useReport.ts` (no query change) |
| W4 (audit policy) | `firebase/firestore.rules`, `firebase/rules.test.js`, `api/test/*` audit matrix test (new file), `web/src/layout/AppShell.test.tsx` is NOT touched by W4 |
| M1 (Flutter F02) | `mobile/pubspec.yaml`, `mobile/lib/features/report/report_flow_page.dart`, `mobile/lib/features/report/submission_result_page.dart`, `mobile/lib/features/report/report_draft_store.dart`, `mobile/lib/data/report_models.dart` (only if a helper is needed), new `mobile/lib/data/photo_identity.dart`, `mobile/test/report_fakes.dart`, new `mobile/test/report_submission_identity_test.dart` |
| M2 (Flutter responder, bootstrap, labels) | `mobile/lib/features/responder/operation_form_page.dart`, `mobile/lib/features/responder/incident_detail_page.dart`, new `mobile/lib/features/responder/operation_transitions.dart`, `mobile/lib/firebase_bootstrap.dart`, `mobile/lib/main.dart`, new `mobile/lib/config/release_config.dart`, `mobile/lib/features/auth/auth_widgets.dart`, `mobile/lib/features/auth/register_page.dart`, `mobile/lib/features/report/report_flow_page.dart` (required labels only, lines after the F02 section), matching tests under `mobile/test/` |

M1 and M2 both touch `report_flow_page.dart`. M1 owns submit and draft logic; M2 owns only label text in the form section. Each reads the file before editing and uses small `Edit` calls.

---

### Task W1: F01 Users layout and F08 web touch targets

**Files:**
- Modify: `web/src/features/users/UsersPage.tsx:150-190` (the management list markup, only if a wrapper class is needed)
- Modify: `web/src/styles.css` (management block near the existing `.management-row` rule)
- Modify: `web/src/components/PasswordInput.tsx`
- Test: `web/src/features/users/UsersPage.team.test.tsx`, `web/src/components/PasswordInput.test.tsx`

**Interfaces:**
- Consumes: none
- Produces: CSS classes `.management-row`, `.management-identity`, `.management-actions` keep their names. A breakpoint at `max-width: 639px` stacks them.

- [ ] **Step 1: Write the failing tests.** In `UsersPage.team.test.tsx`, add a test that renders a staff row with a 60-character name and a long email and asserts the identity element and actions element are both present and the team select has an accessible name (`Team for <name>`). In `PasswordInput.test.tsx`, add a test that the show/hide button has a class `password-toggle` (or the existing class) and that its computed minimum height is set in CSS via a source check: read `web/src/styles.css` text and assert the `.password-control button` rule contains `min-height: 44px`.
- [ ] **Step 2: Run the tests and see them fail.** `cd web && npx vitest run src/features/users/UsersPage.team.test.tsx src/components/PasswordInput.test.tsx`. Expected: the CSS assertion fails.
- [ ] **Step 3: Implement.** Add a `@media (max-width: 639px)` rule: `.management-row` becomes a column; `.management-identity` gets `min-width: 0` and `overflow-wrap: anywhere`; `.management-actions` wraps; `.management-team select` gets `width: 100%`. Add `min-height: 44px; min-width: 44px` to the password toggle button and queue filter tab controls.
- [ ] **Step 4: Run the targeted tests and the web typecheck.** `npx vitest run <same files>` and `npm run typecheck` (or the project's typecheck script). Expected: pass.
- [ ] **Step 5: Rendered check (see Task I1).** Record the measured identity width and row height at 390px in the evidence file. Do not commit.

---

### Task W2: F03 staff notification bell and F09 admin navigation

**Files:**
- Modify: `web/src/layout/AppShell.tsx` (header and NAV)
- Modify: `web/src/features/resident/NotificationBell.tsx` (add `reportHref` prop)
- Test: `web/src/layout/AppShell.test.tsx`, `web/src/features/resident/NotificationBell.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` for `user.uid` and `role`.
- Produces: `NotificationBell({ uid: string; reportHref?: (reportId: string) => string })`. Default href is `/my/reports/${encodeURIComponent(id)}`; staff pass `(id) => \`/incidents/${encodeURIComponent(id)}\``.

- [ ] **Step 1: Write the failing tests.** (a) A dispatcher AppShell renders a button named `Notifications` (or with unread count) in the header. (b) Opening the bell and rendering a notification with `reportId: 'r1'` yields a link `href="/incidents/r1"` for staff. (c) The resident bell test still expects `/my/reports/r1`. (d) An admin AppShell does not render a nav link named `Assignments`. (e) A responder AppShell still renders `Assignments`.
- [ ] **Step 2: Run them and see them fail.** `npx vitest run src/layout/AppShell.test.tsx src/features/resident/NotificationBell.test.tsx`.
- [ ] **Step 3: Implement.** Mount `<NotificationBell uid={user.uid} reportHref={(id) => \`/incidents/${encodeURIComponent(id)}\`} />` in the header of `AppShell` next to the account area, only when `user` exists. Remove the `{ to: '/assignments', ... }` entry from the `admin` array of `NAV`. Do not change motion timings or focus logic.
- [ ] **Step 4: Run the targeted tests, then the full web suite (`npx vitest run`).** Expected: all pass except tests that depend on the removed admin nav item, which must be updated in the same file.
- [ ] **Step 5: Rendered check (Task I1)** for the staff bell at 390 and 1440, with focus return after Escape recorded.

---

### Task W3: F04 responder Notes edits and F10 recent activity

**Files:**
- Modify: `web/src/features/responder/OperationForm.tsx:61-80` (the success branch only)
- Test: `web/src/features/responder/OperationForm.test.tsx`
- Modify: `web/src/features/reports/ResidentReportDetail.tsx` and `web/src/features/incidents/IncidentDetails.tsx` (updates list rendering only)
- Create: `web/src/components/calm/ActivityHistory.tsx` (shared recent/older list with disclosure), and test `web/src/components/calm/ActivityHistory.test.tsx`

**Interfaces:**
- Consumes: updates array from `useReport` (already ordered ascending by `at`).
- Produces: `ActivityHistory<T extends { id: string; note?: string }>({ updates: T[]; renderItem: (u: T) => ReactNode; recentCount?: number })`. It shows the last `recentCount` (default 5) newest first, and a button `Show N older updates` that reveals the rest above the recent block in chronological order. Notes longer than 280 characters render a clamped preview with a `<details>` disclosure labelled `Show full note`. Text is never truncated in the data.

- [ ] **Step 1: Write the failing tests.** (a) OperationForm: use a deferred promise for the POST. Submit, type a new note while pending, resolve the POST successfully, and assert the textarea still has the newer text. Assert a second submit while pending does not send a second request. (b) ActivityHistory: with 50 updates, 5 are visible by default, the `Show 45 older updates` button reveals 50, and the full long text is present in the DOM.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** In `OperationForm`, replace `reset({ ...values, note: '' })` with a reset that keeps only the fields whose current value still equals the submitted value (use `getValues`). Keep `pending.current`, `aria-disabled` and `aria-busy` as they are. Implement `ActivityHistory` and use it in the two detail views.
- [ ] **Step 4: Run the targeted tests and the full web suite.**
- [ ] **Step 5: Rendered check (Task I1)** for the 50-update fixture at 390, recording page height before and after.

---

### Task W4: F05 audit permission matrix (rules, API, web guard)

**Files:**
- Modify: `firebase/firestore.rules` (the `auditLogs` match block only, around line 56)
- Modify: `firebase/rules.test.js` (the test "dispatcher and dmo read" near line 271, plus the matrix test)
- Create: `api/test/audit.permissions.test.js` (new file; use the existing API test harness in `api/test/`)

**Interfaces:**
- Consumes: the existing `ctx.dmo()`, `ctx.dispatcher()`, `ctx.admin()`, `ctx.responderA()`, `ctx.resident()` helpers in `rules.test.js`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests.** Rules: a matrix over `resident`, `responderA`, `dispatcher`, `dmo`, `admin` for `auditLogs/a1` read. Expected: only dispatcher and admin succeed; the old `assertSucceeds(ctx.dmo().doc('auditLogs/a1').get())` becomes `assertFails`. Also add an inactive-admin case if an inactive helper exists; otherwise skip and say so. API: `GET /audit` as dispatcher and admin returns 200; as dmo returns 403; as responder, resident return 403.
- [ ] **Step 2: Run them and see them fail.** Rules: `cd firebase && npx firebase emulators:exec --only firestore "npx vitest run rules.test.js"` or the project's existing rules command (check `firebase/package.json`). API: `cd api && npm test -- audit.permissions`.
- [ ] **Step 3: Implement.** Rules: `allow read: if isActive() && (role() == 'dispatcher' || role() == 'admin');` for `auditLogs`. Do not change `isStaff()`. Do not touch other collections.
- [ ] **Step 4: Rerun rules (129 + new), API audit test, and the full API suite (351 pass, 18 skipped + new).**
- [ ] **Step 5: Verify the web guard.** Confirm `/audit` route guard allow list is dispatcher and admin; if DMO can reach it, add the guard and a test in a new file `web/src/layout/auditRoute.test.tsx` (W4 owns this new file only).

---

### Task M1: F02 Flutter uncertain submission identity and restart

**Files:**
- Modify: `mobile/pubspec.yaml` (add `crypto: ^3.0.3`; confirm the latest compatible version with `flutter pub add crypto`)
- Create: `mobile/lib/data/photo_identity.dart`
- Modify: `mobile/lib/features/report/report_flow_page.dart` (the `_submit` method and its signature, lines ~179–241 only)
- Modify: `mobile/lib/features/report/submission_result_page.dart` (failure page copy and a new uncertain variant)
- Modify: `mobile/lib/features/report/report_draft_store.dart` (add `uncertainSend` flag methods)
- Test: `mobile/test/report_submission_identity_test.dart` (new), `mobile/test/report_fakes.dart`

**Interfaces:**
- Consumes: `newSubmissionKey()` from `mobile/lib/data/submission_key.dart`; `ReportsRepository.create(NewReport)`.
- Produces:
  - `String photoContentDigest(PickedPhoto photo)` in `photo_identity.dart`: SHA-256 hex of `photo.bytes`.
  - `String submissionSignature(ReportDraft draft, List<PickedPhoto> photos)`: canonical JSON of the draft plus the ordered list of photo digests.
  - `DraftStore` gains `Future<bool> loadUncertainSend()`, `Future<void> setUncertainSend(bool value)`, implemented in `ReportDraftStore` per account (key suffix `:uncertain`, value `true` only, no key or content).
  - `bool isUncertainSubmission(Object error)`: true for `ApiException` with status 0 (not `auth`), any status ≥ 500, 429, or code `submission_in_progress` / `submission_unresolved`.

- [ ] **Step 1: Write the failing tests** in `report_submission_identity_test.dart`:
  (a) fake repository throws `ApiException(500, 'server', 'x')` twice; both calls use the same `idempotencyKey`.
  (b) after a 500 with unchanged draft and photo, the failure page text contains `could not confirm` and not `NOT submitted`.
  (c) a photo swap with the same count produces a different `idempotencyKey`.
  (d) `ApiException(400, ...)` drops the key: the next attempt uses a new key.
  (e) with `loadUncertainSend()` returning true at start, submit shows the check-My-Reports message and sends no request; the explicit "send as new report" action clears the flag and sends with a new key.
  (f) `photoContentDigest` of two different byte arrays with equal length differ.
- [ ] **Step 2: Run them and see them fail.** `cd mobile && flutter test test/report_submission_identity_test.dart`.
- [ ] **Step 3: Implement** the helpers, the `_submit` branching (uncertain → keep key and set flag; definite → drop key), the success path clearing the flag, and the restart gating in `initState`.
- [ ] **Step 4: Run `flutter analyze` and `flutter test`.** Expected: analyze clean; tests 128 + new, all pass.
- [ ] **Step 5: Rendered check is not available for native.** Record in the evidence that this is widget-test evidence only.

---

### Task M2: F06 native status transitions, F07 release configuration, F08 native required labels

**Files:**
- Create: `mobile/lib/features/responder/operation_transitions.dart`
- Modify: `mobile/lib/features/responder/operation_form_page.dart` (lines ~21–95: status source and segments)
- Modify: `mobile/lib/features/responder/incident_detail_page.dart` (pass the current status; line ~83)
- Create: `mobile/lib/config/release_config.dart`
- Modify: `mobile/lib/firebase_bootstrap.dart` (remove the release fallback host; keep the debug default)
- Modify: `mobile/lib/main.dart` (show a configuration error when `releaseConfigErrors` is non-empty)
- Modify: `mobile/lib/features/auth/auth_widgets.dart`, `mobile/lib/features/auth/register_page.dart` (required labels)
- Test: `mobile/test/operation_transitions_test.dart`, `mobile/test/release_config_test.dart`, and label assertions in the existing auth test file

**Interfaces:**
- Consumes: the report status strings `'Team Assigned'`, `'Rescue in Progress'`, `'Resolved'` (same as `web/src/features/responder/OperationForm.tsx` `allowedOperationStatuses`).
- Produces:
  - `List<String> allowedOperationStatuses(String? reportStatus)`: `Team Assigned` → `['Rescue in Progress']`; `Rescue in Progress` → `['Rescue in Progress', 'Resolved']`; any other → `[]`; null → all three.
  - `List<String> releaseConfigErrors({required bool releaseMode, required String apiBaseUrl, required bool useEmulators, required String firebaseApiKey, required String firebaseAppId, required String firebaseSenderId, required String firebaseProjectId})`: for release mode, returns messages for a non-HTTPS URL, a `10.0.2.2` or `localhost` host, emulators enabled, or any missing Firebase value. Returns empty in debug mode.
  - Required label marker: `'<label> *'` with a `Semantics(label: '<label>, required')` wrapper, as in C6.

- [ ] **Step 1: Write the failing tests.** (a) `allowedOperationStatuses('Team Assigned')` equals `['Rescue in Progress']` (never contains `Resolved`); `Rescue in Progress` equals both. (b) An `OperationFormPage` widget test with `Team Assigned` shows no `Resolved` segment, and a live status change from `Team Assigned` to `Rescue in Progress` moves the selection to a valid value. (c) `releaseConfigErrors(releaseMode: true, apiBaseUrl: 'http://10.0.2.2:8080/api', ...)` is non-empty and mentions HTTPS; with `useEmulators: true` mentions emulators; with a missing `firebaseApiKey` mentions the key; `releaseMode: false` returns empty. (d) Register name, email and password labels contain the required marker.
- [ ] **Step 2: Run them and see them fail.** `cd mobile && flutter test test/operation_transitions_test.dart test/release_config_test.dart`.
- [ ] **Step 3: Implement** the transitions file, page wiring, the config validator, the bootstrap change and the label marker.
- [ ] **Step 4: Run `flutter analyze` and `flutter test`.** Expected: analyze clean; all tests pass.
- [ ] **Step 5: Release build check.** If Android or iOS toolchains are installed, run `flutter build apk --release --dart-define=...` with fixture values and note the result. If not installed, record "not run: no toolchain" in the evidence file.

---

### Task I1: Integration, rendered evidence and ledger

**Files:**
- Create: `design-plans/integration-2026-10-18/evidence-completion/` (new folder; do not overwrite the frozen audit evidence)
- Modify: `PAGE-LEDGER.md` and `HANDOFF.md` under the integration tree (the same files that exist there) only after checks pass

- [ ] **Step 1: Run the full suites.** Web: `npx vitest run`, typecheck, production build. API: `npm test`. Rules: the existing emulator command. Adapter: 17 cases. Flutter: `flutter analyze` and `flutter test`.
- [ ] **Step 2: Rendered checks** with the production build served locally (`vite preview`), normal motion, Playwright chromium: F01 `/users` at 390 (identity width ≥ 200px, row height bounded, all buttons in viewport, Geist font loaded); F03 staff bell at 390 and 1440 with Escape focus return; F08 password toggle ≥ 44px; F09 admin nav has no Assignments; F10 50-update fixture at 390 with page height recorded. Run axe on each page.
- [ ] **Step 3: Write evidence and ledger.** Record each command, the count, and whether it was mocked, emulator or rendered. Update the ledger rows for affected surfaces.
- [ ] **Step 4: Report** the changed files, the test counts before and after, the skills actually used, and the remaining gates (native device, Cloudinary, email, hosted WebKit, hotline copy).

### Phase D (after I1): dependency triage

Spec section 5 applies. Run `npm audit --omit=dev` in `web/` and `api/`, record each advisory with its disposition, apply only compatible patch/minor updates that keep the suite green, keep the shadcn CSS build asset, and make no forced major downgrade. Deferred until F01–F10 are green so that dependency changes do not mix with product fixes.

