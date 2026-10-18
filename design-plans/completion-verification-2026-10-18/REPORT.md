# Completion verification — 18 October 2026

The current completion changes pass the local checks below. This is not deployment approval. No commit, push, merge, deployment, production credential access, or edit to either original worktree occurred. Product edits in this continuation were confined to four web components/styles, two associated test files, one emulator-test fixture, the permission-spec clarification and handoff documentation.

## Repairs made in this continuation

- Staff bell links previously sent responders to `/incidents/:id`, which their role cannot open. Responders now go to `/assignments`; dispatcher/DMO/admin keep incident links. A new shell regression failed with the old destination and passes now.
- Password toggle positioning moved from an inline style to the shared CSS rule. Removed the test that merely asserted the inline implementation; real rendered measurements now verify the target is 44×44px on phone and 44×46px on desktop. Existing reveal/conceal/value/no-submit behavior test remains.
- Long-note previews now have the missing CSS: three visible lines, wrapping, and a focusable full-note disclosure with a comfortable target. Complete text is retained. The “Hide older updates” control remains intentionally: it lets users reverse an expanded history.
- The emulator fencing test reused `rid-fence-1`, so it failed against its own previous successful run. The report ID now incorporates the already-unique test owner. The full 17-case set passes, and the seven submission cases pass again on that same populated emulator. No data was deleted to hide the failure.

## Owner policy decision

Airen explicitly chose **Preserve current access** in the follow-up question. Dispatcher: Dashboard/Map, not Monitor. Responder: Assignments, not the Analytics page, with existing aggregate stats API access retained. DMO/admin retain Monitor and Analytics. Audit-log access remains dispatcher/admin only under the prior approved decision. Corrected the spec's conflated Monitor/Analytics row into separate page/API rows. No additional permission was granted or removed in this continuation.

## Fresh verification

| Check | Result |
|---|---|
| Web tests and typecheck | **456/456**, 65 files; typecheck clean |
| API tests | **359 passed, 18 skipped**, 44 files; skip count is not a pass |
| Firestore adapter suites | **17/17**; then **7/7** submission cases repeated against the same emulator |
| Firestore rules | **135/135**, including the new audit role matrix |
| Flutter | Analysis clean; **155/155** tests in this independent run |
| Golden checksums | All **15** verify; four changed references visually inspected |
| Ordinary optimized build | Passed; initial preview correctly could not use local emulator authentication because production disables the emulator connection guard |
| Responsive captures | **46** cases at 390 and 1440px; all settled, zero axe violations, zero root overflow, zero Chromium page errors, Geist ready in all 46 |
| Focused UI/motion cases | **18/18**: Users layout, password target, resident/staff history, four staff roles' bells, admin nav at both widths |
| Long identity at 390px | Controlled long name/email fixture: 316px identity, 348px row, zero overflow, controls in bounds |
| Responder pending edit | Preserved; focus retained while busy; repeat Enter sends only one request. Delayed POST success is mocked |

### Rendered evidence classification

Authenticated built-bundle checks require local emulators. The **test build** overrides `import.meta.env.DEV` to true solely to enable the existing emulator connection guard, keeping optimized build output and bundled font assets. This is an explicit test-config override, not an unmodified production release runtime. The ordinary production build also succeeded separately. No product configuration guard was weakened. See emulator-preview.config.mjs and preview-stack.mjs.

All rendered records use fictional local accounts. Responsive captures reuse real role-scoped GET responses across widths to avoid exhausting limits; focused interaction checks make their own local reads. Screenshot captures are not evidence of production data or real delivery. Native tests use fakes and legacy golden references, not a simulator or device.

At 390px Marco's identity block now measures **316px** with Geist loaded; row height **306px**, controls in bounds. At 1440px identity is about 588px. The current history stress fixture has 50 notes of 500 repeated characters: five rows initially, each preview about 70px high; resident page 2526px and staff page 2319px. Expanding shows all 50 and full-note disclosure preserves the exact text. The description/address differ from the earlier stress fixture, so these heights are not a controlled percentage comparison with that run.

Staff notification entry uses a 300ms animation. Escape immediately returns focus; Enter during exit leaves one usable panel with focus inside. Both widths were checked for dispatcher, DMO, responder and admin. Normal motion was used throughout; no reduced-motion audit was performed.

Inspected the four native reference PNGs (register, report-details, report-type, report-location), the phone Users row, phone staff bell and resident history, and selected desktop/role captures. All 46 cases were captured and measured; this does not mean every screenshot received a separate manual full-page inspection.

## Finding disposition

| Finding | Current status / limit |
|---|---|
| F01 Users | Repaired, measured and visually checked at 390/1440. Controlled long-name/email fixture also passes (348px row); keep the browser regression coverage. |
| F02 native retries | Desired widget tests now cover repeated uncertain 500/429 with same key, changed photo bytes, definite refusal and restart blocking until explicit new-send choice. No claim of preserving a key across restart: the approved design uses an uncertainty flag and explicit resolution instead. Storage-write denial and physical restart/transport are not exercised. |
| F03 staff notifications | Bell mounted for staff, role-correct destinations repaired, normal motion/focus checked at both widths. Real push/email delivery and closed-assignment responder destinations are not verified. |
| F04 pending notes | Unit suite and delayed-response browser check pass; new edit retained, one request under repeat activation. |
| F05 audit permissions | API/rules matrices pass. Monitor/Analytics clarification now approved without changing runtime access. |
| F06 native statuses | Transition helper and current-status/live-selection tests pass in the Flutter suite; no device/API operation run. |
| F07 native release config | Pure config tests and analysis pass; no iOS/Android release build or deployed endpoint verification. |
| F08 labels/targets | Four reviewed golden updates and 15 checksums pass; native optional register Phone remains optional. Web password targets measured. Physical-device text/touch behavior still unverified. |
| F09 admin nav | Assignments removed from admin nav and checked at both widths; direct route unchanged as approved. |
| F10 activity | Five recent items, older expansion/collapse, clamped preview and exact full text verified. Firestore still loads the entire history; server pagination is not implemented. |

## Dependency triage

No npm package or lockfile was changed. package.json files match the earlier audited recovery snapshot; lockfiles remain unchanged against the base. The prior same-day raw advisory scans remain in the frozen full-audit folder. They identify two advisory families, not eleven proven app exploits:

- gRPC server certificate-context family: no browser gRPC authentication-server path found; transitive dependency review remains open.
- braces recursion family: build/registry tooling path; no browser-user glob path found, and the maintainer disputes the advisory's practical significance. Preserve shadcn's CSS import when reorganizing tooling.

No fresh registry scan or dependency upgrade was performed here. Do compatible updates in an isolated dependency installation, rerun affected checks, and do not mutate the original worktree's symlinked node_modules or apply forced major downgrades.

## Remaining gates

Non-production Cloudinary uploads and ownership-safe abandoned-photo cleanup, real email/push delivery, hosted Firebase/WebKit, native simulator/device rendering and permissions, release toolchain/build/configuration, approved hotline/privacy/retention copy, and dependency remediation remain open. Other incident transitions still have best-effort effects; creation alone has durable recovery. Claims/jobs have no approved TTL. Native storage-denial/restart behavior is an explicit untested resilience gap. Do not call the whole product release-ready.

## Harness notes

An initial Vitest invocation used the repository root and lacked jsdom setup; the proper web command passed. The first API run was sandbox socket-denied; the permitted local-socket rerun passed. Initial built-bundle script used a dev-only module import, then exposed the intended production emulator guard; both were corrected in the harness/config, not the product. The first responder probe attempted Playwright click on an aria-disabled control; real keyboard Enter was used instead. The old fixed-ID emulator failure was resolved by isolating the fixture and repeating it. No visual reference was regenerated in this continuation.
