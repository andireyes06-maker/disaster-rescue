# Release integration verification: spec (DRAFT, awaiting Airen's approval)

Date: 2026-10-18. Product: Rescue Reports. Owner: Airen.
Predecessor: `design-plans/web-redesign-finish-2026-10-18/HANDOFF.md` (presentation pass complete; four release gates open).

## 1. Intent

The web presentation pass is finished. Before anyone can say the product is deployment-ready, four gates from that handoff need real evidence: uploads, management persistence and concurrency, exports, and transport/reconnect. Devices and Flutter rendering are the fifth. This pass produces a truthful evidence ledger for each gate. It does not redesign anything.

A check counts as **real** only if it goes through the running API and the Firestore/Auth emulator and reads back the stored result. A check counts as **mocked** if any network response, hook, or SDK is faked. Mocked results are labelled as mocked and never presented as persistence or reconnect proof.

## 2. Goals

- **G1 Uploads.** Prove or disprove photo upload with a *non-production* Cloudinary account. If none is configured, record the gate as BLOCKED and run only the contract checks that do not need credentials.
- **G2 Management persistence and concurrency.** Through the real API on the emulator: team create and rename, user role change, the last-admin guard, and two concurrent admin demotions. Read back the stored state after each write.
- **G3 Exports.** Download the incidents CSV and summary PDF through the real API as dispatcher, DMO and admin, and check that the content matches stored reports. Confirm that a resident gets no export. Also download once through the Analytics UI.
- **G4 Transport and reconnect.** On the emulator, take the browser offline and back online on a live page (dispatcher dashboard, resident detail, responder assignments). Write an update through the API while offline, then check that the page shows it after reconnect and says what happened while offline. Record whether the page shows any offline indicator at all.
- **G5 Devices and Flutter.** Run `flutter analyze` and `flutter test` in `mobile/` (required by the workspace rule for Flutter). Attempt a device run. Record physical-device checks as BLOCKED if no device is connected.

## 3. Non-goals

- No commit, push, deploy, or write to production or the live `flutter-5094e` project.
- No product code change unless a defect is reproduced. Any fix comes back through this gate with the reproduction recorded.
- No invented hotline, government affiliation, rescue guarantee, privacy certification, or app-store availability.
- No Hyperframes or film changes. No design changes. No reduced-motion work beyond keeping current support.
- No claim that the Impeccable detector ran (its launcher was denied earlier).

## 4. Environment and safety rules

- **Web target:** `http://localhost:5174`. Two processes listen on 5174: Vite on `[::1]:5174` (ours) and a Flutter `dartvm` on `*:5174` (live project, pid 82279). Before sign-in, every browser run must prove it reached our Vite server with the emulator config. The check: the Firebase Auth requests of the sign-in go to `localhost:9299` and no request reaches `identitytoolkit.googleapis.com`. The run stops if either check fails.
- **Do not touch** the `127.0.0.1:5174` Flutter process, and do not start `flutter run` on any port.
- **Emulator stack:** project `demo-disaster-rescue`; Auth 9299, Firestore 8190, API 3102. Emulator REST reads need `Authorization: Bearer owner`. Demo credentials are read from `api/scripts/seed-demo.js` in the shell and never printed.
- **Writes:** only to the emulator. After the write tests (G2, G4), restore demo data with `npm run seed:demo` in `api/` and confirm the seeded counts.
- **Secrets:** Cloudinary values stay in `api/.env` and are never printed or pasted into chat. Presence checks use key names only.

## 5. Acceptance criteria

Each gate ends with exactly one status per check: **PASS-REAL**, **PASS-MOCKED**, **FAIL** (with the reproduction), or **BLOCKED** (with the owner input needed).

- **G1:** if credentials are present and point to a non-production cloud, a real upload returns a signed `authenticated` URL, the file is readable through that URL, and a deliberate second-file failure removes the first file (`Promise.allSettled` compensation). If credentials are absent, the gate is BLOCKED and the contract tests are labelled as mocked.
- **G2:** after each write, a fresh read gives the new value; a refused last-admin change leaves the stored roles unchanged; of two concurrent demotions of the last two admins, at most one succeeds and at least one admin remains.
- **G3:** CSV rows = stored reports in the same scope; PDF starts with `%PDF`; the resident gets 403; the UI download yields a file with the expected name and size.
- **G4:** offline state visible or explicitly not shown (recorded either way); after reconnect, the update written while offline appears without reload; no duplicate rows; no uncaught page exceptions.
- **G5:** `flutter analyze` and `flutter test` results are recorded verbatim (pass count and any failures). Device checks are BLOCKED unless a device is attached.

## 6. Review against the code (done before this spec)

Read in this pass: `api/src/adapters/cloudinaryUploader.js` (authenticated uploads, signed URLs, compensation on partial failure); `api/src/adapters/firestoreRepo.js` (runTransaction for status, team claim, and admin-set guard); `api/src/routes/export.js` (staff-only, both exports); `api/src/routes/teams.js`, `users.js`, `admin.js` (PUT settings requires a hotline); `web/src/features/analytics/ExportButtons.tsx` (blob download); `useMyReports`, `useAssignedReports`, `useMyNotifications` (onSnapshot subscriptions).

Findings that shape the plan:

1. **Cloudinary:** `api/.env` contains the key names, but whether they point to a non-production cloud is unknown. Gate 1 depends on Airen's answer.
2. **Settings save is blocked** by a missing hotline (no `config/hotlines` document). This is an owner decision. G2 records the refusal and does not write a fake hotline.
3. **Concurrency** is handled in transactions in `firestoreRepo.js`, so G2 must test that behaviour against the emulator. Mocks would not show it.
4. **Offline behaviour** of the subscriptions is not visible in the code (no explicit reconnect indicator found). G4 records what the user actually sees.
5. **Devices:** `adb` is not installed and `xcrun simctl` is not available, so no device or simulator can run here.

## 7. Owner input needed (the "theirs" pile)

1. **Non-production Cloudinary:** is there a dedicated test cloud for this app? Tell me its cloud name (not the key or secret). Without it, G1 stays BLOCKED.
2. **Device:** is a physical Android or iOS device, or a simulator, available to attach to this Mac? Without one, device checks stay BLOCKED. Flutter analyze and test still run.
3. **Hotline:** is there an approved service-area hotline to store for settings? If not, settings save stays blocked by design and G2 covers only the refusal path.

## 8. My own calls (minor, for your review)

- Use `web/node_modules/playwright` for browser runs. Scripts go in the scratchpad, evidence goes in `design-plans/release-integration-2026-10-18/evidence/`.
- Re-seed demo data after write tests (reversible, emulator only).
- Use Chromium for the browser gates. Firefox and WebKit are out of scope here unless a gate fails.
- Use `setOffline` to simulate transport loss. It is a browser-level toggle against the real emulator. It is not a network cut at the OS level, and the ledger will say so.

## 9. Approval

Nothing in sections 4 to 8 has been built yet. Once you approve this spec (and answer section 7, or tell me to proceed with the BLOCKED items recorded), I'll write the plan in `RELEASE-INTEGRATION-PLAN.md` and start with G2, G3 and G5, which need no external input.
