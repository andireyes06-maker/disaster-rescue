# Final Change Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the seven final changes: town grouping for "Reports by location" (W1), Medical team identity (W3), a refined website sign-in with password recovery (W2, W5), the real logo on the phone (M1), profile photos for every role (B1) and an administrator view of the report submitter's profile (W4).

**Architecture:** API first (Express services over a `repo` port, Cloudinary `uploader`), then the web (React, Vitest) and phone (Flutter). Profile photos live on the `users` document as a Cloudinary reference; the API turns it into a URL when it reads a user, so no other record copies a photo. Every route is tested with `supertest` against the in-memory fakes in `api/test/fakes`.

**Tech Stack:** Node (Express, Zod, Vitest, supertest), React 18 + TypeScript (Vitest), Flutter (provider, golden tests), Firebase Auth and Firestore, Cloudinary.

**Spec:** `docs/superpowers/specs/2026-10-29-final-change-requests-design.md`. Read it first; it holds the decisions and the calls Airen approved.

## Global Constraints

- Branch `feat/ui-response-workspace-2026-10-28`. Commit after each task. Never stage `docs/documentation/handoff.md`.
- No push, deploy, rules change or production write without Airen's explicit approval each time.
- No em dashes in user-facing text. Copy is plain and short.
- Opus is the highest model for any subagent or reviewer, never Fable.
- No Android emulators. Do not regenerate a golden image without viewing it. Do not revert the Zod 4 migration. Never print or commit keys.
- Run checks separately: API `cd api && npx vitest run <file>`; web `cd web && npx vitest run <file> --maxWorkers=2` and `npx tsc -b`; Flutter `cd mobile && flutter test <file>` and `flutter analyze`.
- Photo rules: 5 MB limit, image type taken from the file's bytes (`sniffImageType` in `api/src/domain/validation.js`), private Cloudinary delivery. Others may see a photo only when signed in and active.
- The `users` Firestore document stays readable only by its owner and administrators (`firebase/firestore.rules:43`). Do not widen it.

## Review Focus

Failure modes the spec implies that need a test, most likely first. Each has its test in the named task.

1. A text or script file renamed `.jpg` is refused as a profile photo (Task 6).
2. A failed replacement upload keeps the old photo and removes nothing (Task 6).
3. A report sent with no town still saves when the place lookup is slow or down, within a few seconds (Task 2).
4. A town typed with different spacing or case ("GUIGUINTO ") groups with "Guiguinto" (Task 1; already true in `statsService.js:58`, pinned by test).
5. Forgot password for an unknown email shows the same neutral message as a known one (Task 4).
6. The submitter's account is deleted or missing: the profile dialog says it is unavailable, no crash (Task 9).
7. A request for another account's photo change, by changing an id, is impossible because the route has no id (Task 6).

## File Structure

- `api/src/routes/reports.js` (modify): forward `locality`.
- `api/src/services/placeService.js` (modify): expose a town lookup.
- `api/src/services/reportService.js` (modify): fill a missing town.
- `api/src/routes/teams.js`, `web/src/features/teams/TeamsPage.tsx`, `web/src/features/reports/AssignTeamDialog.tsx` (modify): Medical.
- `web/src/features/auth/LoginPage.tsx`, `web/src/pages/public.css` (modify): sign-in. They already have uncommitted edits: read `git diff` first and keep them.
- `mobile/lib/theme/product_navigation.dart`, `mobile/pubspec.yaml`, `mobile/assets/brand/` (modify, add): logo.
- `api/src/domain/userView.js` (create): the safe public shape of a user.
- `api/src/middleware/upload.js` (modify): single profile photo upload.
- `api/src/routes/users.js`, `api/src/services/profilePhotoService.js` (create): photo and profile reads.
- `api/src/adapters/cloudinaryUploader.js`, `api/test/fakes/fakeUploader.js` (modify): `urlFor`.
- `web/src/components/Avatar.tsx` (create), `web/src/layout/AppShell.tsx`, `web/src/features/reports/IncidentPreview.tsx` (modify).
- `mobile/lib/features/profile/profile_page.dart`, `mobile/lib/widgets/user_avatar.dart` (create/modify).

## Task order

W1 (1, 2), W3 (3), W2 and W5 (4), M1 (5), B1 (6, 7, 8), W4 (9), people-can-see surfaces (10), verification and pack (11).

---

### Task 1: Forward the town from the route (W1, root cause)

The phone sends `locality` (`mobile/lib/data/services.dart:49`) and the validator accepts it (`validation.js:69`), but `POST /reports` copies only some fields into `input` (`api/src/routes/reports.js:38-40`), so the town is dropped and analytics groups the report as unrecorded. This is the suspected cause; the first test proves or disproves it.

**Files:**
- Modify: `api/src/routes/reports.js:38-40`
- Test: `api/test/routes/reports.locality.test.js` (create)

**Interfaces:**
- Produces: a saved report carries `locality` whenever the request body has a non-empty `locality`.

- [ ] **Step 1: Write the failing test.** `reports.locality.test.js`, using `makeTestApp` like `test/routes/reports.create.test.js`. Test `saves the town the phone sends`: resident posts a valid report with `locality: 'Guiguinto'`; expect 201 and `(await t.repo.getReport(id)).locality` to equal `'Guiguinto'`. Test `stats group it under that town`: after that post, an admin `GET /api/stats` has `byLocation` equal to `{ Guiguinto: 1 }`. Test `spacing and case do not split a town`: two reports `'Guiguinto'` and `' GUIGUINTO '` give `{ Guiguinto: 2 }`.
- [ ] **Step 2: Run** `cd api && npx vitest run test/routes/reports.locality.test.js`. Expected: first two FAIL (locality undefined). If they PASS, the cause is elsewhere: stop and report before continuing.
- [ ] **Step 3: Add `locality: b.locality`** to the `input` object in `reports.js`.
- [ ] **Step 4: Run** the same file, then `npx vitest run test/routes test/services/stats.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(api): keep the town the phone sends so locations group correctly`.

### Task 2: Fill a missing town from the pin (W1)

**Files:**
- Modify: `api/src/services/placeService.js`, `api/src/services/reportService.js` (the point where `buildReport` is called)
- Test: `api/test/placeService.test.js` (extend), `api/test/routes/reports.locality.test.js` (extend)

**Interfaces:**
- Produces in `placeService.js`: `export function localityOf(address: object): string | null` (first non-empty of `city`, `town`, `municipality`, `village`; never `county`, `state` or `province`) and `lookup.locality(lat: number, lng: number): Promise<string | null>` on the function `createPlaceLookup` returns. `lookup(lat, lng)` keeps returning the display name unchanged. Both share one fetch and one cache entry.
- Consumes in `reportService.create`: `deps.placeLookup.locality`.

- [ ] **Step 1: Write failing tests.** In `placeService.test.js`: `localityOf takes the town, not the county` (`{ county: 'Bulacan', town: 'Guiguinto' }` gives `'Guiguinto'`; `{ county: 'Bulacan' }` gives `null`); `lookup.locality returns the town from a fake fetch reply`. In `reports.locality.test.js`: `fills a missing town from the lookup` (test app with a `placeLookup` fake whose `locality` resolves `'Guiguinto'`; post without `locality`; saved report has it); `a failing lookup still saves the report with no town` (fake rejects); `a slow lookup does not hold the report longer than 3 seconds` (fake never resolves; use fake timers or an injected `maxWaitMs`); `a replay with the same Idempotency-Key still matches` (the filled town must not enter `submissionFingerprint`).
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** `localityOf` and `lookup.locality` in `placeService.js` (refactor the fetch into one internal function returning `{ name, locality }`; the cache value becomes that object). In `reportService.create`, after the idempotency fingerprint is computed and just before `buildReport`, when `data.locality` is empty and `deps.placeLookup?.locality` exists, wait at most 3000 ms for it and ignore any error or timeout.
- [ ] **Step 4: Run** `npx vitest run test/placeService.test.js test/routes test/services`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): fill a missing town from the pin so every report has a location`.

### Task 3: Medical team identity (W3)

**Files:**
- Modify: `api/src/routes/teams.js:11-14`, `web/src/features/teams/TeamsPage.tsx`, `web/src/features/reports/AssignTeamDialog.tsx:56-57`
- Test: `api/test/routes/teams.kind.test.js` (create), `web/src/features/teams/TeamsPage.kind.test.tsx` (create or extend the existing Teams test), `web/src/features/reports/AssignTeamDialog.test.tsx` (extend)

**Interfaces:**
- Produces: `TEAM_KINDS = ['PNP', 'BFP', 'Rescue', 'Medical', 'MDDRMO', 'Other']`. Error text `Choose PNP, BFP, Rescue, Medical, MDDRMO or Other`.

- [ ] **Step 1: Failing tests.** API: `creates a Medical team and reads it back` (POST then GET `/api/teams`, `kind === 'Medical'`); `still rejects an unknown identity (400 invalid_kind)`. Web Teams: the identity select offers `Medical`. Web dialog: a team with `kind: 'Medical'` appears under a Medical tab, not under Rescue.
- [ ] **Step 2: Run** the three files. Expected: FAIL.
- [ ] **Step 3: Implement.** Run `grep -rn "MDDRMO" api/src web/src mobile/lib docs/documentation` and update every list or message that enumerates identities (also the mobile app if it lists them); add a Medical identity mark style if identities have one.
- [ ] **Step 4: Run** the API file, `npx vitest run src/features/teams src/features/reports/AssignTeamDialog --maxWorkers=2`, and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Medical team identity`.

### Task 4: Website sign-in and password recovery (W2, W5)

**Files:**
- Modify: `web/src/features/auth/LoginPage.tsx`, `web/src/pages/public.css`
- Test: `web/src/features/auth/LoginPage.test.tsx`, `LoginPage.websiteAccess.test.tsx` (extend)

**Interfaces:**
- Consumes: `sendPasswordResetEmail(getFirebaseAuth(), email)` from `firebase/auth` and `getFirebaseAuth` from `web/src/firebase-auth.ts`; `api('/auth/reset-help', { method: 'POST', body: { email } })` from `web/src/api/client.ts` (the route answers 202 for any address, `api/src/routes/auth.js:65`).
- Produces: two buttons below the password field, `Forgot password?` and `Contact an admin to reset it`, with the phone's wording (`mobile/lib/features/auth/login_page.dart:44-62,179-201`).

- [ ] **Step 1: Read** `git diff web/src/features/auth web/src/pages/public.css` and keep the earlier session's edits.
- [ ] **Step 2: Failing tests.** `Forgot password with an empty email shows "Enter a valid email address." and sends nothing`; `with a valid email it calls sendPasswordResetEmail once and shows "If an account uses this email, a password reset link will be sent."`; `an unknown-account error from Firebase shows that same message`; `a second click while pending sends nothing more`; `Contact an admin with no email says "Enter your email above, then choose Contact an admin."`; `Contact an admin with an email posts to /auth/reset-help once and shows "Your request was sent. An administrator will send you a reset link."`; `network failure shows an inline error, not a crash`. Keep the existing sign-in tests passing.
- [ ] **Step 3: Run** `cd web && npx vitest run src/features/auth --maxWorkers=2`. Expected: new tests FAIL.
- [ ] **Step 4: Implement** the two actions in `LoginPage.tsx` with their own pending flags and notices (`role="status"` for success, `Banner tone="error"` for errors, field error on the email input). Then refine the layout in `public.css`: clearer hierarchy and spacing, the real logo via the existing `PublicHeader`/`Brand`, balanced form and intro panels, copy that says administrators and rescue teams use the website and residents use the phone. Keep required markers, password visibility, busy state and focus order.
- [ ] **Step 5: Check in a browser** on the local emulators at 390 and 1440 px: no horizontal scroll, normal, invalid, busy and failed states usable. Save screenshots under `design-plans/final-changes-2026-10-29/`.
- [ ] **Step 6: Run** the auth tests and `npx tsc -b`. Expected: PASS. **Commit** `feat(web): refine sign-in and add password recovery`.

### Task 5: Real logo on the phone (M1)

**Files:**
- Modify: `mobile/lib/theme/product_navigation.dart:98-113` (`ProductMark`), `mobile/pubspec.yaml` (assets)
- Create: `mobile/assets/brand/ireport-logo.png` (copied from the approved `web/public/brand/ireport-logo-light.png` or `-dark.png`; open both and use the one that reads on the header colour)
- Test: `mobile/test/product_mark_test.dart` (create); goldens that change

**Interfaces:**
- Produces: `ProductMark({double size})` keeps its signature and now draws the logo with `Image.asset` (semantics excluded as today). Used at `welcome_page.dart:46,241` and `product_navigation.dart:34`.

- [ ] **Step 1: Failing test.** `ProductMark shows the logo image and no plus icon`: pump it, expect `find.byType(Image)` one match and `find.byIcon(Icons.add_rounded)` none.
- [ ] **Step 2: Run** `cd mobile && flutter test test/product_mark_test.dart`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add the asset and its `pubspec.yaml` entry; replace the tile and icon in `ProductMark` with the logo at `size`, keeping it sharp and undistorted (`fit: BoxFit.contain`, `filterQuality: FilterQuality.high`).
- [ ] **Step 4: Run** `flutter test`. For each golden that now differs, view the new image first, then regenerate only those with `flutter test --update-goldens <file>`, and log them in `mobile/test/goldens/PROVENANCE.md` and `SHA256SUMS.txt`.
- [ ] **Step 5: Run** `flutter analyze` and `flutter test`. Expected: clean, all pass. **Commit** `feat(mobile): use the real I-Report logo in headers`.

### Task 6: Profile photo API (B1)

**Files:**
- Create: `api/src/domain/userView.js`, `api/src/services/profilePhotoService.js`
- Modify: `api/src/middleware/upload.js`, `api/src/routes/users.js`, `api/src/adapters/cloudinaryUploader.js`, `api/test/fakes/fakeUploader.js`
- Test: `api/test/routes/profile-photo.test.js` (create)

**Interfaces:**
- Produces `userView(user, uploader): { uid, name, email, phone, role, active, photoUrl: string | null }` (no secrets, no `photo` internals).
- Produces `uploader.urlFor({ publicId, version, format }): string` (same signed, non-expiring URL form `upload` already returns); the fake returns `https://fake.cdn/<publicId>.<format>`.
- Produces `uploadProfilePhoto()` middleware: one file in field `photo`, 5 MB, same error mapping as `uploadPhotos`.
- Produces `GET /api/users/me` (any active signed-in role) responds `200 userView` of the caller; the web and phone read their own photo from it.
- Produces routes: `PUT /api/users/me/photo` (any active signed-in role, multipart `photo`) responds `200 { photoUrl }`; `DELETE /api/users/me/photo` responds `200 { photoUrl: null }`. Both are registered before `/:id` routes and take no id.
- Stores `users/{uid}.photo = { publicId, version, format, updatedAt }`.
- Errors: `400 invalid_photo` (bytes are not jpeg, png or webp), `400 photo_too_large`, `400 photo_required`.

- [ ] **Step 1: Failing tests** in `profile-photo.test.js`: `a resident can upload a png and read it back through userView`; `a text file named photo.jpg is refused (400 invalid_photo) and nothing is stored`; `a file over 5 MB is refused (400 photo_too_large)`; `no file gives 400 photo_required`; `replacing removes the old asset only after the new one is saved` (assert `uploader.removed` holds the old id after success, and is empty when `uploader.failNext` made the replacement fail, with the old photo still readable); `DELETE returns to no photo and removes the asset`; `signed-out request is 401`; `a deactivated account is refused`; `there is no way to name another account` (a `PUT /api/users/<other uid>/photo` returns 404).
- [ ] **Step 2: Run** `cd api && npx vitest run test/routes/profile-photo.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the pieces above. `profilePhotoService.setPhoto({ repo, uploader }, uid, file)`: sniff type, upload, `repo.updateUser(uid, { photo })`, then best-effort destroy of the previous `publicId`; on a failed save remove the new upload. `removePhoto` clears the field then destroys the asset (errors logged, not thrown). Add an audit entry only if other self-service account changes are audited (check `ChangePassword`/user routes first).
- [ ] **Step 4: Run** the new file and `npx vitest run test/routes/users.test.js test/routes/admin-users.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): profile photo upload, replace and remove`.

### Task 7: Profile photo on the website (B1)

**Files:**
- Create: `web/src/components/Avatar.tsx` (`Avatar({ name, photoUrl, size })`: image with onError fallback to initials)
- Modify: `web/src/layout/AppShell.tsx:102-105` (header trigger and the "Your profile" dialog), `web/src/features/users/UsersPage.tsx`, `web/src/features/teams/TeamsPage.tsx` where an `identity-mark` shows a person
- Test: `web/src/components/Avatar.test.tsx`, `web/src/layout/AppShell.profilePhoto.test.tsx`

**Interfaces:**
- Consumes: `GET /users/me`, `PUT /users/me/photo` and `DELETE /users/me/photo` (Task 6) through `api()`.
- Produces: the profile dialog has `Change photo` (file input, accepts `image/jpeg,image/png,image/webp`, 5 MB check before upload), `Remove photo`, progress text, plain error text, and the avatar everywhere the dialog trigger shows the account.

- [ ] **Step 1: Failing tests.** `Avatar shows initials when there is no photo`; `Avatar falls back to initials when the image fails to load`; `choosing a file uploads it and shows the new photo`; `a failed upload keeps the old photo and shows "Could not save your photo. Your current photo is unchanged."`; `a file over 5 MB is refused before any request`; `Remove photo returns to initials`.
- [ ] **Step 2: Run** `cd web && npx vitest run src/components/Avatar.test.tsx src/layout --maxWorkers=2`. Expected: FAIL.
- [ ] **Step 3: Implement** the component and dialog controls; replace the plain `UserRound` icon avatar with `Avatar`. Disable controls while an upload runs; return focus sensibly.
- [ ] **Step 4: Run** the tests and `npx tsc -b`. Expected: PASS. **Commit** `feat(web): profile photo in the account dialog`.

### Task 8: Profile photo on the phone (B1)

**Files:**
- Create: `mobile/lib/widgets/user_avatar.dart` (`UserAvatar({required String name, String? photoUrl, double size})`)
- Modify: `mobile/lib/features/profile/profile_page.dart`, `mobile/lib/data/report_models.dart` (`Profile` gains `photoUrl`), `mobile/lib/data/services.dart` (profile load and a `ProfileRepository.setPhoto(File)` / `removePhoto()` that call the Task 6 routes with the existing authenticated client and the existing picker in `features/report/photo_picker.dart`)
- Test: `mobile/test/profile_photo_test.dart`, `mobile/test/user_avatar_test.dart`

**Interfaces:**
- Consumes: Task 6 routes.
- Produces: profile page shows the avatar, `Change photo` and `Remove photo`; failures show an `InlineError`; resident and responder both reach it through the existing profile tab.

- [ ] **Step 1: Failing tests.** `UserAvatar shows initials without a photo`; `UserAvatar falls back to initials on an image error`; `profile page uploads a picked photo and shows it`; `a failed upload keeps the old photo and shows an error`; `Remove photo clears it`. Use the fakes in `mobile/test/fakes.dart`.
- [ ] **Step 2: Run** `cd mobile && flutter test test/user_avatar_test.dart test/profile_photo_test.dart`. Expected: FAIL.
- [ ] **Step 3: Implement.** Reuse the existing 5 MB and type checks from the report photo flow; no new camera permission (gallery pick only; camera stays whatever the picker already offers).
- [ ] **Step 4: Run** `flutter analyze` and `flutter test`. View and log any golden that changes. Expected: clean, all pass. **Commit** `feat(mobile): profile photo on the profile page`.

### Task 9: Administrator opens the submitter's profile (W4)

**Files:**
- Modify: `api/src/routes/users.js` (add `GET /:id`, admin only, returns `userView`), `web/src/features/reports/IncidentPreview.tsx` (it already receives a `reporter` prop, `ReportQueue.tsx:291`) and the `IncidentDetails.tsx:299` area (a button on the submitter's name)
- Create: `web/src/features/reports/SubmitterProfileDialog.tsx`
- Test: `api/test/routes/users.profile.test.js`, `web/src/features/reports/SubmitterProfileDialog.test.tsx`

**Interfaces:**
- Consumes: `report.reporterId` (set at `reportService.js:54`; type at `web/src/types/domain.ts:50`), `userView` (Task 6).
- Produces: `GET /api/users/:id` returns `200 userView` for an admin, `404 not_found` for a missing account, `403` for any other role, never a password, token or `photo` internals.
- The dialog shows name, photo, email, phone, role, status, read only. It opens from the submitter name, labelled as the account that submitted the report and kept separate from "Contact person". Focus returns to the opener on close.

- [ ] **Step 1: Failing tests.** API: `admin reads a user`; `resident, responder get 403`; `unknown id gives 404`; `response has no password or photo.publicId`. Web: `opens the profile of reporterId even when the contact person is someone else`; `shows "This profile is unavailable" for a 404`; `focus returns to the name button on close`; `no button when the report has no reporterId`.
- [ ] **Step 2: Run** both. Expected: FAIL.
- [ ] **Step 3: Implement** the route and dialog; load the profile only when the dialog opens.
- [ ] **Step 4: Run** `cd api && npx vitest run test/routes/users.profile.test.js`, `cd ../web && npx vitest run src/features/reports --maxWorkers=2`, `npx tsc -b`. Expected: PASS. **Commit** `feat: administrator can open the report submitter's profile`.

### Task 10: Show photos where a person's name is already shown (B1)

Today a person's name reaches another user in two places: the resident's name and phone on a responder's assigned report (`api/src/services/reviewService.js:87`, shown at `web/src/features/responder/AssignmentsPage.tsx:142` and the phone responder detail) and the administrator's user list. A resident does not currently see any responder's name, so "a resident sees the assigned responder's photo" has no surface yet. Do not build one here; Airen decides (see handoff).

**Files:**
- Modify: `api/src/services/reviewService.js:87`, `api/src/domain/privacy.js` (keep `reporterName` and `reporterPhone` removal for non-staff; add `reporterPhotoUrl` alongside them), web `AssignmentsPage.tsx`, `IncidentDetails.tsx`, `UsersPage.tsx`, phone responder incident detail
- Test: `api/test/routes/reports.review.test.js` (extend), plus one web and one Flutter test

**Interfaces:**
- Produces `reporterPhotoUrl: string | null` next to `reporterName` wherever `reporterName` is returned; removed in `privacy.js` exactly where `reporterName` is removed.

- [ ] **Step 1: Failing tests.** API: `a responder's assigned report carries reporterPhotoUrl`; `a resident's own report view does not carry another person's photo`; `no photo gives null`. Web: `the assignment contact shows the avatar`. Flutter: `responder incident detail shows the resident avatar`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** with `Avatar` and `UserAvatar`.
- [ ] **Step 4: Run** the API test and `npx vitest run`, `flutter test` for the touched files. Expected: PASS. **Commit** `feat: show profile photos beside names staff already see`.

### Task 11: Fresh sample reports, verification and pack refresh

**Files:**
- Modify: the local demo seed (`api/scripts/seed-demo.js` and `firebase/seed.js`) so each sample report carries a real `locality` from its pin; `docs/documentation/*` where they describe sign-in, teams, photos or location; handoff files (not `docs/documentation/handoff.md`)
- Test: `api/test/demo-seed.guards.test.js` (extend)

- [ ] **Step 1: Failing test.** Every seeded report has a non-empty `locality`, and no seeded locality is a county or province name.
- [ ] **Step 2: Implement** the seed change. This only changes local emulator data. Clearing the production reports and writing fresh ones is a production write: ask Airen, describe exactly what will be deleted and created, and wait for a yes.
- [ ] **Step 3: Run each check separately:** `cd api && npm test`; `cd web && npx tsc -b`, `npx vitest run --maxWorkers=2`, `npm run build`; `cd mobile && flutter analyze` then `flutter test`.
- [ ] **Step 4: Browser pass** on local emulators, signed in as administrator and responder at 390 and 1440 px: sign-in states, Teams (Medical), Analytics location chart and table agree with the report list, incident submitter dialog, profile photo upload and remove. Save evidence under `design-plans/final-changes-2026-10-29/`.
- [ ] **Step 5: Request the whole-branch Opus review** (`54080d9..HEAD`, model `claude-opus-5-5`). Fix Critical and Important findings test-first. If the account limit blocks it again, say so; do not claim it passed.
- [ ] **Step 6: Rebuild the APK** only after Airen approves; refresh the affected pack files, source ZIP, checksums and `SHA256SUMS.txt`; correct the stale queue-order docs only if Airen chose that path.
- [ ] **Step 7: Update `HANDOFF.md`** (Start here 60 lines max, resume prompt) and commit. Say plainly what was not checked: physical Android or iOS, real push, screen readers, live-provider checks, and any production step not approved.

## Self-review notes

- Spec coverage: W1 (1, 2, 11), W2 and W5 (4), W3 (3), W4 (9), M1 (5), B1 (6, 7, 8, 10), verification gates (11).
- Spec correction found while planning: the website already has a "Your profile" dialog in `AppShell.tsx`, so web photos go there rather than a new page; and the route that creates reports drops the phone's `locality`. Neither changes a decision Airen made.
- Open for Airen: whether a resident should see the assigned responder's photo (needs a new surface showing a responder's identity, not built here).
