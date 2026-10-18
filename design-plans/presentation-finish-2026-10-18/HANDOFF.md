# Harbor presentation finishing pass — 18 October 2026

## Result

Implemented the confirmed finding from `../finished-look-review-2026-10-18/REPORT.md`: QA records were making otherwise complete pages look unfinished. The current website is now available with clean fictional Harbor content at **http://localhost:5176**.

This is an isolated presentation workspace, not a rewrite or cleanup of the QA database on 5174. The original QA reports, test identities, mocked-failure scenarios, and sample evidence remain available there. No production configuration or records changed. The current visual design and motion implementation are preserved.

## Delivered

- Separate Firebase project `demo-harbor-presentation` and dedicated emulator/API/web ports. The launcher supplies explicit web environment values; it does not edit `.env.local` or production settings.
- 24 linked reports, 12 teams, and 12 named accounts with reserved `@harbor.example` addresses, coherent status/assignment/update/notification/audit relationships, and launch-relative dates. Summary metrics derive from the records: 24 reports, 17 active, six active critical, 15 verified.
- Specific fictional Harbor landmarks replace generic district-only presentation addresses. Rejected report has an actionable explanation.
- Presentation reports have no synthetic attachments, so the sample-evidence thumbnails are absent. This deliberately does not supply fake incident photographs or alter real attachment handling. QA's photo fixtures are preserved.
- Resident safety notice is populated. No emergency number is invented; the Admin hotline field remains empty pending an owner-verified number.
- Repeatable launch: `cd api` then `npm run presentation`. Startup refuses occupied IPv4/IPv6 ports and populated presentation report collections. Presentation seeding refuses any other project. Emulator hosts must match the dedicated loopback ports. Service-account and Cloudinary credentials are stripped from the child environment.
- Launcher shutdown targets its own spawned process group on macOS/Linux. During development the first launcher version left an orphan Vite process after stopping its Firebase parent; those task-owned processes were cleaned up and process-group shutdown was added. The final launcher successfully started; a complete stop/start cycle of the final process-group implementation was not separately exercised.

## Files introduced or extended in this pass

- `demo-data/presentation.mjs`: reuses the existing linked Harbor scenario and changes presentation addresses, rejection copy, and attachments.
- `demo-data/PRESENTATION.md`: usage, accounts, lifecycle, isolation, and limitations.
- `firebase/firebase.presentation.json`: separate local emulator ports.
- `api/scripts/start-presentation.mjs`: guarded seed and stack launcher.
- `api/scripts/seed-demo.js`: adds presentation scenario, guarded by exact project ID. Existing default and QA scenarios remain available.
- `api/package.json`: adds only the `presentation` script in this pass; other working-tree changes predate this work.
- `api/test/presentation.test.js`: three tests covering environment refusals, refusal to seed the QA project, and linked scenario integrity without synthetic evidence.

## Verified

- 29 targeted tests pass across presentation, existing scenario, and existing seed-guard suites. `node --check` and `git diff --check` pass.
- Final browser capture matrix: **48 Chromium route/role/width cases**, covering all 18 previously audited page surfaces plus a populated resident response-history variant, at 390 and 1440 CSS pixels. `surfaces.json` records zero axe findings, zero horizontal overflow, zero captured page runtime errors, zero flagged QA/filler copy, zero API writes, and settled loading placeholders in every case.
- Expanded Admin: **eight** settled captures across Accounts, Teams, System, and Audit at both widths. Zero axe findings or horizontal overflow. The initial 500ms captures caught loading skeletons; these were replaced with captures that explicitly wait for the section skeleton to disappear.
- Bell: both widths show clean linked notification content, opening animations recorded, and focus returns to the bell after Escape. No mark-as-read requests made. See `bell.json` and screenshots.
- Individually viewed final captures include dashboard at both widths, Accounts desktop, System phone, resident hub phone, resident detail desktop, populated response history phone, Users desktop, and notification bell phone.

The browser scripts block non-GET API requests after sign-in. Seeding the isolated workspace is the intentional data mutation in this pass. No QA or production writes were made. Normal motion remained enabled; no reduced-motion audit was performed.

## Limits

This closes the local presentation-content finding. It does not make the application universally “perfect” or certify deployment. No fresh Firefox/WebKit, device, Flutter, exhaustive workflow, upload, or animation-performance pass was performed. Real uploads still require non-production Cloudinary configuration. Verified hotline, privacy decisions, persistence/concurrency/idempotency, in-app navigation protection, and previous release gates remain tracked in the earlier ledgers.

The presentation emulators are ephemeral. A fresh launch recreates the clean fictional scenario; do not treat edits made during a presentation session as retained operational data. Do stress testing in the separate QA workspace to keep the presentation coherent.

Nothing committed, pushed, merged, or deployed. The shared working tree contains substantial pre-existing edits; do not commit it wholesale.
