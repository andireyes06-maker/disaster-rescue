# Evidence index

REPORT.md and PAGE-LEDGER.md are the current continuation findings. CLAUDE-NEXT.md is the continuation prompt. The historical full audit remains frozen separately.

- web-tests.log, api-tests.log, rules-tests.log, emulator-tests-isolated.log, emulator-repeat.log, flutter-analyze.log, flutter-tests.log: final checks.
- bell-before.log: new responder destination regression observed failing before repair.
- surfaces/surfaces.json and PNGs: 46 route/role/width captures, normal motion, Geist loaded, axe/overflow/readiness results; role-scoped GET fixtures reused across widths.
- interaction-checks.json: 18 focused layout, history, target, bell motion/focus and nav cases.
- responder-save.json: delayed mocked success, retained new note and one request under repeat Enter.
- users-long-identity.json: controlled content fixture, no real account modification.
- source-bundle/: full changed/new source overlay, binary patch, manifest, checksums and clean-base reconstruction proof.
- verification.json and start-manifest.json: what changed during this continuation.

Local optimized test preview was left on http://localhost:5182 with emulator-only API3110, Auth9799 and Firestore8690 in project demo-full-audit-2026-10-18. preview-stack.mjs builds an emulator-enabled test bundle using emulator-preview.config.mjs. Ordinary production build rejects emulator connections by design; its build output is recorded in ordinary-build-preview-attempt.log. Do not deploy the test bundle or mistake test configuration for release certification. preview-dist is generated and omitted from the durable evidence copy; the launcher can regenerate it. The earlier audit stack and unrelated services were not stopped.

All fixture accounts/data are fictional and local. Original worktree product files were not edited. Read scripts before rerunning: they create isolated fixture reports/notifications and consume local API limits. Raw initial emulator failure remains in emulator-tests.log, with the successful isolated rerun and repeat in separate logs. No reduced-motion or current Firefox/WebKit continuation run is claimed.
