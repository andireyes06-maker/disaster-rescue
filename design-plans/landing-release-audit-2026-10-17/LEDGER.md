# Release audit ledger: all surfaces (continuation)

Oct 17, 2026 · Claude · working tree only, nothing committed, pushed, or deployed.
Environment: web demo app on `http://localhost:5174` (VITE demo stack), demo API on 3102 (CORS allows only `localhost:5174`), demo emulators. Automated: Chromium 156 via Playwright, axe-core (WCAG 2.0/2.1/2.2 A/AA + best-practice). Evidence JSON and screenshots sit beside this file.

**Important:** `127.0.0.1:5174` is a Flutter web run (`flutter run -d chrome`) wired to the live project `flutter-5094e` with API `localhost:8080`. It was not touched. Audits use `localhost:5174`, which resolves to the React demo app.

Severity: P1 blocks release or a core task for assistive tech; P2 usability or a WCAG-relevant gap; P3 polish. "Captured and viewed" means I opened the screenshot.

## Hosting and release inputs (read-only)

| Check | Result | Status |
|---|---|---|
| Vercel Production env names | `VITE_API_BASE_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN` all present (`vercel env ls production`). Values are encrypted and were not read. | Present |
| Live bundle `disaster-rescue-web.vercel.app` | API host `https://disaster-rescue-api.onrender.com/api`; Firebase project `flutter-5094e`; no `localhost` reference found. Build commit `effd53f` (the last committed state, **not** this working tree). | Set; reflects the committed build |
| Release gate | Not run against hosting inputs. The local `preflight:release` only checks local env values. | Pending owner check before the next deploy |

## Access pages: sign-in, registration, Forbidden

| ID | Sev | Source | Finding | Change | Browser checks | Evidence | Unverified |
|---|---|---|---|---|---|---|---|
| A01 | P1 | Browser behaviour test | After a wrong password, focus fell to `<body>`. The disabled submit button drops focus while busy. | Failed sign-in returns focus to the password field (`LoginPage.tsx`). Unit test added. | Wrong-password flow: focus = `password`, email kept, password kept, alert text present. | `access/login-phone-wrong-password-viewport.png` (viewed) | Screen-reader speech |
| A02 | P1 | Code review | Registration failure (generic and "account created, setup incomplete") also dropped focus to `<body>`. | Both error branches focus `#password` (`ResidentSignUp.tsx`). | Not browser-tested for these two branches; code change only. | none | Browser run of these branches (needs forced API failure) |
| A03 | P2 | axe `region` (moderate) | Skip link sat between header and `<main>`, outside landmarks. | Skip link moved before the header on sign-in, registration, Forbidden. Same order as the landing. | axe: zero violations on all three, phone and desktop. | `access/access-audit.json` | — |
| A04 | P2 | Measured target size | Inline "Create a resident account" and "Sign in" links were 17px tall (42×17). | `.login__help a` gets `padding-block: 14px` (touch area 44px, line layout unchanged). | Measured: zero targets under 44px on all access pages. | `access-audit.json` | — |
| A05 | P2 | Measured font size | Aside notes were 12px (`product.css` override beat `public.css`); help text 13px. | Aside notes 14px, help text 14px, field hint 13px, demo notice 13px. | Measured. Remaining 13px items are metadata, which DESIGN.md allows. | `access-audit.json` | — |
| A06 | P3 | Measured target | Skip link measured 43px at focus. | `min-height: 44px` on `.skip-link`. | Measured. | — | — |
| A07 | P3 | Viewed screenshot | Signed-out Forbidden copy "Sign in to continue." gave no reason. | "This page needs a signed-in account. Sign in with the account that has access to it." Test updated. | Rendered at 390 and 1440. | `access/forbidden-phone.png` (viewed) | — |
| A08 | — | Behaviour test | Registration to `/my`, taken email, role guard, and recovery all worked. Resident on `/dashboard` lands on `/forbidden`, then "Go to my page" returns to `/my`. | None. | Browser run. The audit account is emulator-only. | Printed in session only; no file saved | Live Firebase sign-in not tested |
| A09 | — | Environment note | First registration attempt at `[::1]:5174` showed "setup did not finish". Cause: CORS. The demo API allows only `localhost:5174`. Not a product defect. | None (environment). Use `localhost:5174` for demo checks. | Reproduced and explained. | — | — |

Access axe after fixes: zero violations, zero targets under 44px, zero page errors.

## Signed-in surfaces (demo roles at 390 and 1440)

| ID | Sev | Source | Finding | Change | Browser checks | Evidence | Status |
|---|---|---|---|---|---|---|---|
| S01 | P2 | axe `scrollable-region-focusable` (serious) | Analytics chart data table scroll region was not keyboard reachable. | `.table-wrap` gets `tabIndex={0}` and `aria-labelledby` (`ChartCard.tsx`). | axe clean on analytics, phone and desktop. | `surfaces/surface-audit.json` | Fixed |
| S02 | P2 | axe `region` (moderate) | Resident pages had no `<main>`; the heading band sat outside landmarks. | Layout owns one `<main id="resident-main">` with band and body. Three child pages changed from `<main>` to `<div>` (avoids nesting). Test added. | axe clean on all three resident routes, both widths. | surface audit | Fixed |
| S03 | P2 | Measured targets, phone | Back links 18–19px tall; "Open in maps" 18px (responders use phones); dispatcher filter chips 36px; inputs 40px; admin nav 42px. | `.touch-link` (44px) on back links and maps link. Phone rule (≤719px): chips, nav, and inputs 44px. | Target count dropped on several routes (resident detail phone 1→0, responder phone 1→0, dispatcher analytics phone 4→2; desktop analytics unchanged at 4). | surface audit | Mostly fixed; see S08 |
| S04 | P3 | axe `aria-allowed-role` (minor) | `role="group"` on `<form>` in audit and analytics filters. | Removed role; the form keeps its accessible name. | axe clean. | surface audit | Fixed |
| S05 | P2 | Measured font size | Text under 12px on staff and resident chrome: nav labels, account name, status badges at 11px ("Under Verification", "Critical"), audit/table headers at 11px. Dispatcher dashboard at phone: 110 samples. | None yet. | Measured only. | `surface-audit.json` (`smallSamples`) | **Open.** Needs a type-scale pass for staff chrome and badges. |
| S06 | P2 | Code review (confirmed on login) | Many forms set `disabled={busy}` on submit, which drops focus while saving (ReportForm, IncidentDetails, UsersPage, TeamsPage, OperationForm, AssignmentsPage, AssignTeamDialog, ResidentReportDetail, others). | Fixed only on sign-in and registration (A01, A02). | — | — | **Open.** Same pattern elsewhere. Fix with `aria-disabled` plus a guard, or return focus after save. |
| S07 | P2 | Measured targets | Map and monitor severity markers are 24px `DIV`s. Unclear whether they are interactive. | None. | Measured. | `surface-audit.json` | **Open.** Confirm interactivity; if interactive, enlarge hit area. |
| S08 | P3 | Measured targets | Leaflet attribution link 14px tall (third-party control); users "Deactivate" 43px; admin nav desktop 42px. | None. | Measured. | `surface-audit.json` | **Open** (minor) |
| S09 | P3 | Viewed screenshot | Dispatcher phone header: account name and "Sign out" wrap awkwardly beside "Menu". Inbox search placeholder clipped at 390px. | None. | Viewed `demo-dispatcher-a-dashboard-phone.png`. | `surfaces/demo-dispatcher-a-dashboard-phone.png` | **Open** (polish) |
| S10 | P3 | Code review | `RoleRoute` loading state is bare "Loading..." text, unlike the branded landing skeleton. Shared across every protected route. | None. | — | — | **Open** (shared state) |
| S11 | — | Viewed screenshot | Resident `/my` at 390: layout, banner, cards, and map read cleanly. | None. | Viewed `demo-resident-a-my-phone.png`. | `surfaces/demo-resident-a-my-phone.png` | Checked |

Signed-in automated results after fixes: no page errors, no horizontal overflow, and no axe violations on resident routes; minor/moderate findings on dispatcher, DMO, responder, and admin routes are now zero.

## Shared states

| State | Checked | Result |
|---|---|---|
| Sign-in and registration validation, phone and desktop | axe, DOM, focus | Clean after fixes (A01–A05) |
| Taken email on registration | behaviour run | Field error, focus on email, name kept |
| Wrong password | behaviour run | Alert, focus on password, values kept |
| Role guard and recovery | behaviour run | Works |
| Analytics loading and scroll regions | axe | Clean after S01 |
| Empty, error, and retry on staff queue and registration | Not run | **Not verified** |
| Session restore while signed in (RoleRoute loading) | Not verified in a live timed state | S10 open |

## Not verified in this pass

- Firefox and WebKit for these changes. The earlier Chromium pass (access pages, landing) is the only browser run for this continuation.
- Screen-reader speech for error announcements and focus moves.
- Physical phones (iOS/Android), Flutter, real API and Firebase sign-in on live data.
- Populated staff states that depend on real reports (only the demo data was used).
- The Impeccable launcher was not executed in this pass. Hook output reported "no deterministic design-quality issues" on edited files only. It is not a design audit.
- Lighthouse was not re-run after these changes.

## Continuation pass, staff chrome (Oct 17, evening)

Changes are uncommitted.

| ID | Change | Verified here | Still open |
|---|---|---|---|
| S05 | `.badge`, `table th`, `.filters label`, `.shell__brand > small` raised from 11px to 12px in `web/src/product.css`. | Web suite 319 pass, typecheck clean. Full surface audit re-run (`evidence/surfaces/surface-audit.json`, axe clean on all routes at 390 and 1440). | The audit counts text under 13px, so these counts did not move: dispatcher dashboard phone 110, desktop 113. Many staff labels remain at 12px or below, and the landing sample styles are unchanged on purpose. |
| S06 | Busy submit and action buttons now use `aria-disabled` + `aria-busy` instead of `disabled`: ReportForm, ResidentReportDetail cancel, IncidentDetails (mark, assign, close, verify, reject, classify, confirm reject), OperationForm, AssignTeamDialog, AssignmentsPage acknowledge. Each handler guards re-entry (`if (busy) return`). | Typecheck and suite pass. **Not** verified in a browser: focus retention during a live save was not observed. | Not yet changed: AccountsPanel, UsersPage, TeamsPage, ExportButtons, NotificationBell "Saving…". |
| S10 | `RoleRoute` loading now renders the shared `Skeleton` (status label "Checking your account…") inside a `<main>`. | RoleRoute tests updated and pass (13 in `src/routes`). | Not seen live during a timed session restore. |

Note: an ad hoc `ONLY=` run overwrote `surfaces/surface-audit.json` with `[]`. The full audit was re-run to restore it. Earlier screenshots were replaced by the current build.


## Codex continuation: remaining busy controls (October 17)

AccountsPanel, UsersPage, TeamsPage, ExportButtons, and NotificationBell now retain busy focus and guard repeat activation. Successful disappearing role/read actions receive explicit focus handling. 328 tests / 49 files, typecheck and build pass. Chromium 1440 and WebKit 390 delayed-failure checks pass for team create/rename, staff create/status, and CSV export using intercepted requests on the demo emulator. No audit writes persisted. Evidence and verification boundaries: `../busy-focus-2026-10-17/HANDOFF.md`. S06 is not claimed fully browser verified across all previous controls. S05 and timed S10 remain open.


## Codex continuation: staff readability and states (October 17)

This section supersedes the earlier open statuses only to the extent verified below.

| Item | Current result | Evidence / limits |
|---|---|---|
| S05 | Fixed in measured signed-in layouts: 13px minimum default size, larger inbox descriptions, chart ticks and map attribution included. Dashboard 390: 110→0 under-13px samples; 1440: 113→0. | `../staff-readability-2026-10-17/final.json`, 39 combinations. Admin/resident sessions; not every staff role newly signed in. |
| S07 | Interactive markers now 44×44px with explicit Enter/Space navigation and visible focus. Dense labels appear on hover/focus. | Real demo Enter in Chromium, Space in Firefox/WebKit at 390/1440. |
| S08 | Admin links and management action buttons now at least 44px. Attribution underlined and 13px; inline target remains compact. | Partially fixed; third-party compact targets remain. |
| S09 | Phone account grid and persistent search hint replace awkward wrapping/clipped placeholder. | Phone dashboard screenshot viewed; responsive/three-engine checks. |
| S10 | Real delayed session restore observed: one main, named account-check skeleton, then recovered Dashboard. | `../staff-readability-2026-10-17/states.json`, Chromium emulator token response held. |
| Staff states | Genuine empty inbox distinguished from filtered/no-match; clear search+filters restores focus and rows. Map skeleton, filtered-empty message/reset added. | Shared-hook harness verifies loading/error/retry/empty rendering; actual search recovery verified separately. Transport recovery not claimed. |

334 tests / 49 files, clean typecheck/build. Full findings and remaining gaps: `../staff-readability-2026-10-17/HANDOFF.md`. Earlier cross-browser raw search samples preceded the React update; the targeted waited rerun is the final recovery evidence. No writes persisted; nothing committed/pushed/deployed.


## Full-page quality pass (Codex, October 17)

Airen clarified the scope: whole-page design and task completion across the product, beyond individual technical findings. The successor page-by-page record is `../full-page-audit-2026-10-17/PAGE-REVIEW.md`; implementation, evidence and limits are in its `HANDOFF.md`, with `CLAUDE-NEXT.md` for continuation. All 16 existing post-landing routes plus missing-page recovery have a review entry. Access, resident, staff, management and admin changes are recorded by page. 340 tests / 50 files; typecheck/build pass. This does not close every previous mutation, transport, device or owner-input gap. Nothing committed, pushed or deployed.


## Admin and whole-page state continuation (Codex, October 17–18)

See `../admin-state-audit-2026-10-17/HANDOFF.md`. Admin accounts/roles/teams/settings/health and audit now have deeper failure/recovery handling, truthful creation versus refresh feedback, pending-access retry, own-account guards, search/filter recovery and long-content/Safari layout fixes. Users/Teams/Analytics/resident map no longer treat malformed top-level responses as empty data; Audit rejects reversed dates. 354 tests / 51 files, typecheck/build pass. Evidence records 76 broader controlled page-state cases, 40 Admin cases each in Chromium/WebKit and final four-width layout checks. No writes persisted. WebKit emulator transport errors are retained separately and unresolved. Actual persistence, transport, physical/Flutter and factual hotline/privacy inputs remain open. Nothing committed, pushed or deployed.
