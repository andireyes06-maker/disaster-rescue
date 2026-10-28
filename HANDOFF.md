# Handoff: I-Report, 28 October 2026 (evening)

> Branch `feat/ui-response-workspace-2026-10-28`. Production branch `build/disaster-rescue` (a push deploys the live web and API; push only with explicit approval each time). Recording day is 29 October.

## Start here
- **Local only, not pushed:** `1bc45c3` (web audit repairs), `0bcbfe2` (mobile lost-photo recovery), `4dcaa25` (overview greeting). Live site is still `dc6f7cc`. Checks on this tree: `tsc` clean, web 583 tests pass (78 files), `npm run build` ok, Flutter analyze clean, 281 tests pass. `npm run build:release` needs deploy env vars, so it was not run.
- **Audits run today (read-only subagents, then fixed):** security (no high or medium; lockout is advisory, comments corrected; frame protection and nosniff added in `web/vercel.json`, full CSP not added because it cannot be checked without a browser run), accessibility (input border contrast, failed sign-in message tied to the password field, Show password name, dead forgot-password code removed), code review (OperationForm stuck busy after same-account sign-in, "load more" resetting the list, Android lost photo), copy (em dashes, "report" and "progress updates" wording). Each new test was confirmed to fail without its fix.
- **Not verified:** nothing run on a phone or in a signed-in browser. Mobile lost-photo recovery (`ImagePickerPhotoService.recoverLost`) is covered by unit and widget tests only. Header changes are untested on Vercel.
- **Next, in order:**
  1. Owner asks Codex for a frontend audit of this tree, then fix what it finds.
  2. Emergency types: spec first (`X-SPEC.md`, no code before approval). Owner wants Medical emergency, Road hazard and Power line added to Flood, Fire, Landslide, Earthquake and Other. Their screenshot is a map legend (TYPE row with icon chips); take inspiration, do not copy.
  3. Approve a push of the three local commits (deploys production).
- **Places that hard-code emergency types (from the code review):** `web/src/types/domain.ts:3`, `web/src/lib/schemas.ts:83`, `web/src/features/map/disasterSymbols.tsx:3-9`, `web/src/features/reports/IncidentPreview.tsx:15-29`, `ReportQueue.tsx:70-71`, `web/src/features/analytics/ChartCard.tsx:20`, `web/src/styles.css:186-190` plus `--color-flood/fire/quake/slide`, `web/src/responder-workspace.css:29-31`, `web/src/pages/Landing.tsx:68`, `api/src/domain/validation.js:55`, `mobile/lib/data/report_models.dart:3`, `mobile/lib/features/report/report_flow_page.dart:33-55`. Other mobile screens fall back to `reportTypeInfo['other']`. Rules and indexes hold no type list. Re-check line numbers before use.
- **Open owner decisions (older):** keep or delete `CLAUDE-SECURITY-20261028-063336/` (empty scan output); fresh release APK for the professor (still `update14`, no camera change); which "Rescue" names outside the package to rename; physical-phone camera test; manual check of the closed-assignments tab on the live site with `sample.rescuer@harbor.example` (password in `~/Documents/i-report-sample-logins.txt`).

## Gotchas
- Production log deletion (updates, notifications, auditLogs) is done and backed up at `~/.config/i-report/prod-logs-backup-2026-10-28/`. Do not repeat.
- Index deploy is done. Production writes, Firebase deploys and rules changes need approval. No Android emulators.
- Device takeover allowed, email-as-password reset accepted, empty-team assignment refused on purpose. Do not regenerate goldens without viewing them. Do not revert the Zod 4 migration.
- `docs/documentation/handoff.md` has uncommitted edits from another session; do not commit it with this work.
- Never print or commit keys. Use new emails for new sample accounts.
- zsh does not split an unquoted variable of file names; pass them one per line to `xargs`.

## Resume prompt
"Read HANDOFF.md, then continue from step 1 of Next. Tell me what you need from me."

## Pointers
- Older handoffs: `docs/history.md`. Earlier audit record: `design-plans/responder-web-audit-2026-10-28/`.
