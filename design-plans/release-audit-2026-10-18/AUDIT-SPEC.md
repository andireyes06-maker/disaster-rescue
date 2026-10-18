# Release-readiness audit: spec (18 October 2026)

Status: **approved by Airen on 18 October 2026 ("yes").** Decisions: proposed ports and project ID (section 7) approved; no non-production Cloudinary or hosted Firebase supplied, so those checks are blocked; subagents not used (inline); Reticle wiring not done, since it edits app files and this audit is read-only on product code (browser tools only, unless Airen says otherwise).

## 1. Intent

Find out, with fresh evidence, whether the Rescue Reports website is ready for release. Do not rely on passing suites or earlier reports. Produce a page-by-page ledger, reproducible findings, a candid verdict, a prioritized repair plan, and a handoff that a new session can resume from.

This is an audit. It does not fix product code.

## 2. Goals

1. Test every surface in the scope list (section 5) for function, frontend design, UX, accessibility, responsiveness (390, 768, 1024, 1440 px) and normal-motion behavior.
2. Reproduce or falsify findings F01 to F10 from `design-plans/functional-audit-2026-10-18/REPORT.md`, each with its own fresh run. Do not mark any of them fixed because a unit test passes.
3. Check role permissions, direct API access, record ownership, deactivation, role changes and last-admin protection with real requests.
4. Check persistence with reload and with an independent stored-data readback where practical.
5. Run the existing web, API, rules, typecheck and build checks. Report results verbatim.
6. Check Chromium fully. Check Firefox and WebKit on the critical flows. Investigate the two WebKit Firestore Listen errors instead of reporting WebKit clean.
7. Output: ledger, findings, verdict, repair plan, and a self-contained handoff.

## 3. Non-goals

- No product source changes, fixes, refactors or design edits.
- No commits, merges, pushes, deploys, or production credentials.
- No new reduced-motion audit. Existing support stays as it is.
- No Flutter or physical-device certification.
- No real external email, push or invitation sends.
- No changes to the approved Geist, violet and deep-indigo identity.

## 4. Anti-goals (each would make the audit worthless)

- Calling a page "passed" on the strength of a unit test, or on a mocked response.
- Counting a browser-injected failure (for example Playwright route abort or `setOffline`) as a real service failure. Label each one.
- Using the earlier functional audit's data as fresh evidence.
- Writing into the mutated `demo-functional-audit` workspace, or reseeding it to replay tests.
- Touching the clean Harbor presentation (5176), original QA (5174), or the live-config Flutter process on 127.0.0.1:5174.
- Inventing a hotline, affiliation, credential-delivery success, incident evidence, or production test result.

## 5. Scope (surfaces)

Landing `/`; login; registration; Forbidden; 404; resident hub `/my`; report submission `/my/report`; resident report detail; dispatcher dashboard `/dashboard`; incident details; operational map `/map`; DMO monitor `/monitor`; responder assignments `/assignments`; teams `/teams`; users `/users`; analytics `/analytics`; audit log `/audit`; admin sections (accounts, health, settings, teams) under `/admin`.

## 6. Constraints

- **Shared working tree.** It has about 246 changed entries from other sessions. Read only. Do not revert, stage, format or "clean" anything in it. Write only inside the new audit folder.
- **Rate limit.** The API allows 300 requests per 15 minutes. Pace the runs. Do not disable or raise the limit. Record every 429 and keep it separate from product results.
- **Emulator identity.** Before each sign-in or write, confirm the project ID and the emulator host. Stop if they do not match.
- **Ports.** Use only the fresh workspace in section 7. Never use 5174, 5176, or 127.0.0.1:5174.
- **Browsers.** Only browsers that are actually installed count. Check availability in preflight. Do not claim an unavailable browser was tested.
- **Hosted services.** No real Cloudinary upload, real email/push, or hosted Firebase write unless a non-production target is supplied (see section 12).

## 7. Environment (proposed)

The current functional-audit workspace is mutated and must not be reused. Proposed new workspace:

| Service | Proposed | Notes |
| --- | --- | --- |
| Web | 5178 | |
| API | 3105 | |
| Auth emulator | 9500 | |
| Firestore emulator | 8391 | |
| Project ID | `demo-release-audit` | Must not match `demo-functional-audit` or any live ID. |

Startup must confirm the workspace is fresh and empty before seeding.

## 8. Method

**P0: Preflight (read-only plus setup).**
- Confirm every planned port is free and that the clean presentation (5176), QA (5174) and live Flutter (127.0.0.1:5174) are left alone.
- Run the baseline checks: web tests, web typecheck, API tests, rules tests, web build. Record the logs.
- Record which browsers are installed (Chromium, Firefox, WebKit).
- Confirm whether axe-core and the Reticle wiring are available. Section 12 asks about Reticle.

**P1: Fresh workspace.**
- Start the emulators and API on the section 7 ports with project `demo-release-audit`.
- Seed the minimum accounts for each role through the existing seed scripts, after checking they accept a new project ID. If a script hard-codes the old project, stop and record the blocker. Do not patch the script without approval.
- Verify the auth and Firestore project IDs before any browser sign-in.

**P2: Functional matrix.**
- Access: registration, duplicates, wrong password, session restore, logout, the five-role route matrix and direct API access.
- Resident: report validation, locations, attachments, submit, retry, idempotency, cancellation, unsaved navigation.
- Dispatcher: verify, priority, classification, rejection, duplicate, assignment, closure, team release.
- Responder: assigned-team isolation, acknowledge, progress, resolution.
- Management: staff creation and onboarding, team membership, role changes, deactivation, last-admin protection, settings, audit records.
- Read surfaces: search and filters, and CSV/PDF contents against the selected scope.
- States: loading, empty, error, offline, stale, reconnect, and interrupted requests.

**P3: Findings re-check.** Run a separate, reproducible check for F01 to F10. Each must end as one of: reproduced, not reproduced, or blocked (with the reason).

**P4: Frontend and motion.** For each surface, take complete-page screenshots at 390, 768, 1024 and 1440 px, including lower sections and expanded controls. Judge hierarchy, typography, spacing, alignment, contrast, touch targets, and content quality. Check required-field stars, error text and icons, focus movement, keyboard operation, dialogs, notifications and success feedback. Review normal-motion transitions, entrances, notification stagger, loading skeletons, interruption, and settled visibility.

**P5: Accessibility.** Run axe-core on each surface where it can be loaded. Test keyboard-only paths on the critical flows. Treat automated results as leads that need a manual check.

**P6: Cross-browser.** Full Chromium pass. Firefox and WebKit on sign-in, report submission, dispatcher update, and realtime. Investigate the WebKit Listen errors: capture console output, find the trigger, and check whether it also occurs in Chromium.

**P7: Evidence and reporting.** Write the outputs in section 10.

### Evidence rules

- A finding is reported only after it has reproduced twice, once in a fresh run, with a file of evidence.
- Separate each result into one of: product defect, selector mistake, emulator limitation, rate limit, unavailable service, or harness error.
- Keep failed attempts in the raw logs. Correct the harness and rerun, but say so.

## 9. Acceptance

The audit is complete when every surface in section 5 has a ledger status (inspected, passed, failed, blocked, or not tested), and every F01 to F10 finding has a fresh outcome. The verdict must name anything left untested. A "not tested" entry is acceptable. An implicit gap is not.

## 10. Deliverables (new folder `design-plans/release-audit-2026-10-18/`)

- `AUDIT-REPORT.md`: verdict, method, environment, test results, limits.
- `LEDGER.md`: page-by-page status for each surface, across the four widths, and across the browsers.
- `FINDINGS.md`: each finding with ID, severity, reproduction steps, expected versus actual, source location, screenshot and log references.
- `REPAIR-PLAN.md`: prioritized, with acceptance checks for each item.
- `CLAUDE-HANDOFF.md`: self-contained start-here for the next session.
- `evidence/`: screenshots, logs, JSON results.

Severity scale: **Blocker** (release stops), **Critical** (a core flow or security boundary fails), **High**, **Medium**, **Low**.

## 11. Assumptions and decisions made in this draft

These are my calls. Change any of them.

- Use the Rescue Reports web app as built on the working tree (not the older hosted commit).
- Keep `REPORT.md` from the functional audit as history, not as evidence.
- Do not edit the shared `HANDOFF.md`. The new handoff sits in the audit folder. I can add a one-line pointer to `HANDOFF.md` later if you want one.
- Do not commit the audit folder. The prompt says no commits.
- The existing work-state item ("fix demonstrated problems") is superseded by the audit-only prompt.
- Run inline, without subagents, unless you approve them (section 12).

## 12. Open questions for Airen

1. **Reticle.** The Reticle tool reports that this web app is not wired. Wiring modifies app files. Yes or no?
2. **Ports.** Approve the section 7 ports for the fresh workspace, or give other ports?
3. **Non-production services.** Is there a non-production Cloudinary or hosted Firebase target for real upload and the WebKit Listen check? If not, those checks are reported as blocked.
4. **Subagents.** Use subagents for the browser passes, or run everything inline? Default: inline.

## 13. Builder check (inline, not a subagent)

Read as a builder would, the spec answers these: what to test (section 5), how (section 8), what counts as done (section 9), and where outputs go (section 10). Unanswered items are the four in section 12. Minor items settled here: the rate limit is paced, not raised; the seed script is reused only if it accepts a new project ID; axe findings are leads.
