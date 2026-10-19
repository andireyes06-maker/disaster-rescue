# Demo content: plan

Approved spec: `plans/demo-content-SPEC.md`. Decisions taken: Q1 = 17 active (stats definition), Q2 = local emulators only, Q3 = `config/demo` rule added to the emulator rules now, production deploy held.
Not committed (per brief). Repair work in progress in the tree is preserved; no edits to its files beyond the listed touch points.

## Findings that change the plan (from first build pass)

- Emulator ports: Auth is already held on 9099 (PID 70953) and Firestore 8080 by PID 82217. Use Firestore 8180 and Auth 9199 for the demo, matching the handoff's Firestore 8180. Web hardcodes 8080 and 9099, so ports become env-configurable with the old defaults.
- API `config.js` and `server.js` require Cloudinary and a service-account file even against emulators. Allow an emulator-only path (no service account when `FIRESTORE_EMULATOR_HOST` is set). Cloudinary stays required for production.
- Flutter has no emulator wiring at all. Add an opt-in `USE_EMULATORS` dart-define that points Firestore and Auth at the emulator. Default behavior is unchanged.
- The spec named `demo-data/default.json` as the manifest. Building it as a generated JS module (`demo-data/scenario.mjs`) gives the same single source and keeps tests simple. Noted as a deviation.

## Phases

1. **Scenario builder and tests.** `demo-data/scenario.mjs` builds all records from `DEMO_NOW`. Tests assert: 24 reports, status and type counts, 17 active, 6 active critical, 15 verified, 6 needs-verification, 12 teams with 8 busy and 4 available, team/report consistency, timestamps ordered and not in the future, rescued totals as increments, duplicate target valid. Also a generator for sample evidence images (`demo-data/evidence/`, Pillow, labeled "Sample evidence").
2. **Seed command.** `api/scripts/seed-demo.mjs`, run via `npm run seed:demo` through `firebase emulators:exec`. Guards: both emulator hosts required; project ID must be an emulator project; refuses `--real`. Writes with stable IDs (full-document `set`), auth create-or-reuse for demo accounts, `config/demo`. `--reset` deletes only `demo-` IDs. `--scenario qa` adds the opt-in QA variant.
3. **Rules.** `config/demo` readable by active users. Rules tests added. Deploy not run.
4. **API.** Emulator-only config path. Exports read `config/demo`: demo filenames `demo-sample-` and a PDF header label. Tests.
5. **Web.** Env-configurable emulator ports. `useDemoIndicator` reads `config/demo`. "Demo workspace · Sample data" label in the masthead and on exports. Demo photo keys resolve to `web/public/demo-evidence/`. Tests keep loading, empty, and error states.
6. **Flutter.** `USE_EMULATORS` dart-define wiring. Demo label. Demo photo keys resolve to `mobile/assets/demo-evidence/`. `flutter analyze` and `flutter test`.
7. **Verification.** Emulator up on 8180/9199. Seed twice and diff counts. Run API, web, rules, and Flutter suites. Start API (3101) and Vite (5173). Capture screenshots of populated views. Report what was not checked.

## Checkpoints

After phase 1, re-read the spec counts and confirm the scenario asserts match before the seed exists.

## Status (build complete, uncommitted)

- Phase 1 scenario: `demo-data/scenario.mjs` (24 reports, 12 teams, 12 accounts, updates, audit, notifications, QA set). Tests: `api/test/demo-scenario.test.js`, 20 + 1 QA assertions.
- Phase 2 seed: `api/scripts/seed-demo.js`, `npm run seed:demo`, `npm run demo:emulators`, `npm run test:demo-emulator`. Emulator idempotency, reset, and stale pruning verified; guards in `api/test/demo-seed.guards.test.js`.
- Phase 3 rules: `config/demo` read-only for active users; rules suite 128 passing.
- Phase 4 API: emulator-only config path; demo-sample export names and PDF label; `getDemoConfig` on the repo port; 302 passing.
- Phase 5 web: env-configurable emulator ports; `useDemoIndicator`, `DemoBadge` in the shell top bar; demo evidence resolver; 249 passing; tsc clean.
- Phase 6 Flutter: `USE_EMULATORS` dart-defines; demo strip above all screens; analyze clean; 124 passing. Mobile does not display evidence photos, so it has no photo assets.
- Phase 7 verification: live API stats match the brief; dispatcher and responder journeys checked in a headless browser with screenshots.

## Deviations from the spec

- Scenario is a generated JS module, not `demo-data/default.json`.
- Teams without a responder account (Charlie, Echo, Golf, Hotel, India, Juliet) have their updates recorded with `byUid` set to Demo Dispatcher B, as relayed entries.
- Demo stack ports: Firestore 8190, Auth 9299 (8180 and 9099 are held by other sessions).
- Seeding prunes demo-owned records not in the chosen scenario, so QA rows never linger in the default set.

## Finding for the audit (not changed)

- `statsService` treats Resolved as not open (17 active). `workflow.js` `isOpen` treats Resolved as open (19). The demo shows 17, as approved.

## Not done

- Not deployed, not committed, not pushed. The `config/demo` rule is in the emulator rules only.
- Resident and analytics screens were not screenshotted. Exports were checked by route tests, not in a browser.
- Flutter was not run on a device or emulator against the demo stack.
- Browser checks: desktop width only. No phone-width, 200% zoom, or keyboard pass.
- The QA scenario is seeded and tested in the emulator but not viewed in the browser.
