# Whole-product redesign: spec and completion ledger

Status: draft for Airen's approval. No product code has been changed for this spec.
Source: `design-plans/landing-audit-2026-10-17/AUDIT.md` and `CLAUDE-WHOLE-PRODUCT-REDESIGN-PROMPT.md`.
Baseline: `effd53f` plus the uncommitted working tree (API, rules, demo, and mobile recovery repairs are preserved).
Guides consulted: `project-standards/README.md` (order), `10-frontend`, `06-website-ui-ux`, `08-animation-and-motion`, `15-audit-verification`.

## 1. Why this spec exists

Airen wants the whole product revamped: the public site, every signed-in web route for every role, and the Flutter app. The landing page has not received a compositional change since `e9c6426`. Fresh captures prove this: local and live desktop and phone screenshots are byte-identical. The October dashboard work is one screen, and the dashboard is an identity example, not a template.

Per Airen's `CLAUDE.md` for big work: brainstorm, spec, review against code, plan, then build. **No code before the spec is approved.** This document is that spec. The rule is the `CLAUDE.md` line "No code before the spec is approved", plus the spec gate in the brainstorming skill.

## 2. Goals and non-goals

Goals
- Every row in the web and native ledgers (section 6) implemented with a page-specific composition, reviewed on a rendered build, with before and after captures.
- One identity across surfaces: the indigo/violet tokens, the masthead pattern, and the calm component set. Compositions differ per task.
- Preserve permissions, the incident lifecycle, the API contract, the security repairs, and owner-scoped offline drafts.

Non-goals
- No new palette pass, and no copying the dashboard sidebar into public or native screens.
- No new data fields, roles, lifecycle states, or fabricated public facts (hotline, privacy approval, app-store availability, endorsements, response times).
- No commit, push, deploy, or production data change. These need separate approval.

Anti-goals
- A dashboard clone reused for every screen.
- Empty states, error states, and offline states removed so the demo looks populated.
- Another wall of equal cards on the landing page.

## 3. Design direction

The accepted references are `design-plans/dashboard-concept-v11-final-web.png` (web) and `design-plans/mobile-concept-v2-refined.png` (native). They are concepts, not evidence of the product. Shared identity:

- Tokens: `web/src/theme/tokens.css` (primary `#6D28D9`, harbor `#21134D`, paper `#EDEDF7`, status tones). Native tokens are reconciled to the same values (section 5.3).
- Type: one scale per surface. Landing headings are larger and tighter than app page headings. Body text keeps 16px minimum on phones.
- Surfaces: paper background, white cards with the existing shadow token, 8px and 12px radii.
- Icons: lucide on web, Material icons on native, one icon per concept.
- Priority and status always show text and icon as well as color.

## 4. Decisions for approval

1. **Landing composition (section 5.1).** Proposed: split hero with resident and staff entries, a labeled illustrative scene, a six-step lifecycle strip, audience pairs, an honest availability block, and a finished footer. *Recommend: approve as written.*
2. **Privacy placeholder.** Proposed: replace the "pending review" line with a visible "Privacy notice: pending review" status and a link to the existing notice route, without inventing policy text. *Recommend: approve.*
3. **App availability.** Proposed: state "Mobile app not publicly released. Ask your team lead for a demo build." Remove the repeated copies. *Recommend: approve.*
4. **Native theme migration.** Proposed: move Flutter `app_theme.dart` from `0F6B66` and `F6F1EA` to the web token values, one shared list of names. *Recommend: approve.*
5. **Milestones.** Landing first, then web routes by role (resident, staff, admin), then native flows, then the verification pass. Each milestone ends with a review and a stop. *Recommend: approve.*
6. **Documentation.** Mark `docs/superpowers/specs/2026-10-16-website-redesign-design.md` and the older landing exclusions as superseded. Update `PRODUCT.md` on residents using web routes as well as the mobile app. *Recommend: approve.*

## 5. Architecture and owners

### 5.1 Landing (`/`)

Current owner: `web/src/pages/Landing.tsx`, `web/src/styles/public.css`, `web/src/components/PublicHeader.tsx`, `web/src/routes/Home.tsx`.

New composition, top to bottom:
1. **Header.** Compact brand, anchor links (How it works, Who it is for, Mobile app), sign-in choice. Phone: a menu button.
2. **Hero, split on desktop.** Left: a short headline, one sentence of purpose, two equal primary actions: "Report an emergency" (resident path) and "Staff sign in" (staff path). Right: the illustrative scene (5.1a). Phone: headline, actions, then the scene below, so the actions stay visible early.
3. **Resident path with returning residents.** A single resident block: "New here? Create an account" and "Already a resident? Sign in." Sign-in is inside the resident path, not behind a staff link.
4. **Lifecycle strip.** Six steps as a horizontal rail on desktop and a vertical rail on phones: Submitted, Verified, Assigned, In progress, Resolved, Closed. Each step is one line of plain text.
5. **Audience pairs.** Two columns of short benefits: residents and responders, dispatchers and DMO. Not four equal cards.
6. **Availability.** A single honest block: the website is available; the mobile app is not publicly released. No store badges.
7. **Privacy and safety.** Safety line from the existing notice. Privacy status per decision 2.
8. **Footer.** Brand, staff sign-in, privacy notice, and the existing credits line. Finished layout with clear grouping.

5.1a Illustrative scene: an inline SVG schematic built from existing icons and tokens. It shows a generic report pin, a verification check, a team marker, and a resolved mark along one path. It is labeled "Illustrative. Not live data." It contains no real locations, counts, or names.

### 5.2 Web

Owners: `web/src/layout/AppShell.tsx`, `web/src/features/resident/ResidentLayout.tsx`, `web/src/components/calm/*`, `web/src/components/ui/*`, `web/src/styles.css`, and the feature pages listed below. Reused: `components/calm/Skeleton.tsx`, `StatusBadge`, `PriorityBadge`, `VerifiedBadge`, `DataTable`, `EmptyState`, `Banner`.

Layout changes by route are in section 6. The shared rules are:
- Dashboard shell (sidebar, masthead) is for staff and admin only.
- Resident routes use `ResidentLayout`, which is a single-column task layout, not the staff sidebar.
- Public and auth routes use the public header and footer.
- Responsive: at 1024px and 768px, the staff sidebar becomes a drawer. The public header becomes a menu.

### 5.3 Native

Owners: `mobile/lib/theme/app_theme.dart`, `mobile/lib/features/**`, `mobile/lib/auth/role_gate.dart`. Reused: existing draft store, submission key, and API client. Motion uses Flutter's default route transitions, with shared durations defined once.

Theme: primary, background, and status colors come from the web token values. Text scale is respected up to 200%.

## 6. Completion ledger

Each row needs: the owner files changed, the composition change, the role variants covered, the states exercised, and before and after evidence paths. Status values: Implemented, Visually verified, Behavior verified, Blocked. A row is not complete without evidence.

### 6.1 Web

| Route | Composition change | Roles | States to exercise | Status |
|---|---|---|---|---|
| `/` | Section 5.1 composition | signed-out | desktop 1440, phone 390, anchors, app availability, footer | Not started |
| `/login` | Access screen: audience line per door (staff), readable form, separate resident link | signed-out | validation, submitting, failed credentials, session restore, destination by role | Implemented; visually verified at 390 and 1440. Behavior verified on emulator: sign-in, session restore, role redirects, cross-role guard, malformed and empty email. Captures in `design-plans/access-pages-m2/`. |
| `/register` | Resident welcome: requirements list, what happens next, step indicator | signed-out | field errors, submitting, duplicate account, recovery, success continuation | Implemented; visually verified at 390 and 1440. Behavior verified on emulator: fresh registration to `/my`, duplicate email (wrong password) field error, interrupted-setup retry path. Not verified: a delayed or failed profile call against the running API. |
| `/forbidden` | Designed explanation with the current role and a permitted next step | all roles | role context shown, sign out, home | Implemented. Visually verified: signed out, responder, unrecognized role (1440). Behavior verified on emulator through the real provider for the unrecognized role. Resident capture pending. |
| `/my` | Resident hub: prominent "Report an emergency" action, status summary (count by state), history list | resident | no reports, active and history, notifications where supported, refresh, error | Not started |
| `/my/report` | Grouped steps (what, where, details, review) with a clear submit area | resident | location permission, photos, validation, pending submission, failed retry, success | Not started |
| `/my/reports/:id` | Status header, submitted evidence, response history timeline | resident | long history, missing image, unknown or deleted record, role-safe content | Not started |
| `/dashboard` | Dispatcher workbench: queue, selected-report panel, filter bar; phone stacks the panel under the queue | dispatcher, admin | filters, selection, priority and status text, loading, empty, error, narrow layout | Not started |
| `/incidents/:id` | Task workspace: situation, evidence, timeline, then the permitted next action | dispatcher, dmo, admin | verify, reject, assign, status controls as authorized; pending, error, success, dialogs | Not started |
| `/monitor` | DMO overview: summary strip, status and area breakdown, read-only list | dmo, admin | current summaries, filters, no data, error, allowed actions | Not started |
| `/map` | Map-first: list and legend beside the map; phone shows a bottom panel | dispatcher, admin | loading, map failure, no coordinates, overlap, keyboard access | Not started |
| `/analytics` | Hierarchy: period controls, key figures, charts with a text table alternative, definitions | dispatcher, dmo, admin | date and filter controls, no data, error, export feedback, narrow chart | Not started |
| `/audit` | Event list: actor, action, time as the scan order; filter bar | dispatcher, admin | filters, pagination, long values, no results, retry, timestamp clarity | Not started |
| `/teams` | Team cards with availability and membership; create and edit in a dialog | dispatcher, admin | search, empty, create and edit dialogs, validation, failed save | Not started |
| `/users` | Table of identity, role and status; role change confirmed in a dialog | dispatcher, admin | long names and email, role-change confirmation, save and revoke feedback, permission boundary | Not started |
| `/assignments` | Responder workspace: next assignment first, then the rest | responder, admin | no assignments, acknowledgment, progress update, failed action, stale data | Not started |
| `/admin` | Overview with grouped sections: accounts, teams, settings, health, audit | admin | each section, tables and forms, dialogs, permitted actions | Not started |
| Shared surfaces | Sidebar, masthead, resident nav, public header and footer, inputs, tables, tabs, dialogs, notices | all | active, focus, disabled, pressed; session loading and expired; route fallback; drawer | Not started |

Role variants: resident, dispatcher, DMO, responder, admin. Each staff route is exercised for each allowed role, not only admin.

### 6.2 Native

| Screen | Owner file | Composition change | States | Status |
|---|---|---|---|---|
| Sign-in | `features/auth/login_page.dart` | Mobile identity; keyboard-safe action | busy, error, recovery | Not started |
| Register | `features/auth/register_page.dart` | Step layout, requirements | validation, busy, duplicate, success | Not started |
| Role gate | `auth/role_gate.dart` | Session loading and expired states | loading, expired, wrong role | Not started |
| Resident home | `features/home/resident_home.dart` | Primary report action and status summary; bottom navigation | empty, active, offline | Not started |
| Report flow (4 steps) | `features/report/report_flow_page.dart` | Step indicator; what, where, details, review | validation per step, draft restore, discard | Not started |
| Location and map picker | `features/report/location_picker.dart` | Permission prompt, coordinate summary, retry | denied, no GPS, accepted | Not started |
| Photo picker | `features/report/photo_picker.dart` | Thumbnails, remove, limit message | limit reached, too large, bad type | Not started |
| Hotline button | `features/report/hotline_button.dart` | Placed as a secondary action; placeholder honest | not configured, configured | Not started |
| Submission result | `features/report/submission_result_page.dart` | Distinct success and retryable failure; duplicate protection | pending, success, failed, retry | Not started |
| My reports | `features/my_reports/my_reports_page.dart` | List with status text, pull to refresh | loading skeleton, empty, error, refresh | Not started |
| Status timeline | `features/my_reports/status_timeline.dart` | Vertical timeline with timestamps | long history, missing item | Not started |
| Notifications | `features/notifications/notifications_page.dart` | Groups, read and unread text plus marker | empty, error, refresh, navigation | Not started |
| Incident map | `features/map/incident_map_page.dart`, `map_markers.dart` | Touch controls, selected detail sheet | no coordinates, error, permission | Not started |
| Profile | `features/profile/profile_page.dart` | Account details, sign out, long values | long name or email | Not started |
| Assigned list | `features/responder/assigned_list_page.dart` | Urgency and next action first | empty, loading, error, refresh | Not started |
| Incident detail | `features/responder/incident_detail_page.dart` | Evidence and status hierarchy | pending, failed update | Not started |
| Operation form | `features/responder/operation_form_page.dart` | Validation, acknowledgment, progress | pending, failed, success | Not started |
| Offline help | `features/offline/offline_help_page.dart` | Honest connectivity and retry guidance | offline, back online | Not started |
| Demo strip | `features/demo/demo_workspace_strip.dart` | Keep the label; restyle to the new identity | active, inactive | Not started |
| Shared surfaces | `theme/app_theme.dart` | App bars, sheets, buttons, fields, badges, skeletons, feedback, safe areas, text scaling | all | Not started |

Routes found in source and not in the audit inventory: none. The `*` wildcard redirects to `/`; it gets a check in the shared rows.

## 7. States and motion

- Loading: skeletons match each real layout (for example, queue rows, card grids). Skeletons are used only when the structure is known. Background refresh keeps content visible.
- Empty and filtered-empty are separate messages with a next step.
- Error and retry: each failed request has a retry action that names what failed.
- Offline and permission-denied: each has a distinct explanation.
- Motion tokens: one duration set (fast 120ms, standard 200ms), one easing. Reduced motion removes transitions. No looping decorative motion on operational screens. Interrupted transitions are tested.
- Focus: dialogs trap focus and restore it on close. Visible focus everywhere.

## 8. Verification plan

1. Baseline capture of every row, before changes: desktop 1440, phone 390, and 1024 and 768 for complex layouts.
2. Web: `npm run test`, `npm run build`, and Playwright journeys for each role (resident, dispatcher, DMO, responder, admin) using local demo services only.
3. Native: `flutter analyze` and `flutter test`. Device or emulator rendering is required for native completion. If no emulator is available, native visual verification is reported as blocked.
4. Accessibility: keyboard path, focus visibility, contrast, labels, touch target size, and 200% text scale.
5. Compare each screen against the references and the ledger. Passing tests do not replace rendered review.
6. Re-run the API and rules suites if any API or rules file changes.

Scope of this pass: the October predeployment API and rules repairs are not re-audited here. They are checked only if this work touches them.

## 9. Milestones and stop points

- **M1 Landing.** Section 5.1 implemented; desktop and phone captured; reviewed. Stop for Airen's review.
- **M2 Public and auth.** `/login`, `/register`, `/forbidden`. Stop.
- **M3 Resident web.** `/my`, `/my/report`, `/my/reports/:id`. Stop.
- **M4 Staff web.** `/dashboard`, `/incidents/:id`, `/monitor`, `/map`, `/analytics`, `/audit`, `/teams`, `/users`, `/assignments`, `/admin`. Stop after each role group.
- **M5 Native.** Theme, then the screens in section 6.2. Stop per flow group.
- **M6 Verification and documentation.** Ledger completed with evidence; superseded documents marked; `PRODUCT.md` reconciled.

Each stop waits for Airen. Work does not continue past a stop without her reply.

## 10. Risks and limits

- The native rendering depends on an available emulator or device. If none is available, section 6.2 stays at Implemented with native visual verification blocked.
- The audit's technical findings are historical. They are rechecked against current source before being reported as open.
- Each route must be checked for each role that can reach it. An admin screenshot does not prove dispatcher, DMO, or responder behavior.
- The redesign changes layout only. If a composition requires a new permission, a new lifecycle state, or a fabricated fact, the change stops and the decision is returned to Airen.
