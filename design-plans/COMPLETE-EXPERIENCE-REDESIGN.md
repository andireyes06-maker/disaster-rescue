# Complete website experience redesign

For Airen. October 16, 2026. **Design specification only; application-code changes are not authorized.**

Airen requested a redesign of motion, UI/UX, and the rest of the website after requesting a complete palette replacement. Preserve the sidebar and meaningful decorative incident icons. Airen subsequently rejected the weak color presence of the warm palette. The latest exploration is deep indigo, electric violet, and crisp white, specified in `STRONG-PALETTE-PROPOSAL.md`. It is a proposal, not a finalized visual approval. The warm scheme, earlier blue scheme, and top-navigation concepts are superseded as proposed directions.

Source inspected at commit `162f2fc` plus existing working-tree edits. Other work is in progress in `web/src/App.tsx`, `web/src/styles.css`, and resident layout files. Do not overwrite it. This specification changes no product source.

## Scope and evidence

The current route composition is `web/src/App.tsx`. It now includes resident registration, resident reports, and admin screens in addition to dispatcher, responder, and DMO routes. The early redesign proposal's mobile-only resident assumption is stale. Preserve the actual web capabilities, privacy boundaries, and existing API authorization.

This is a proposed replacement interaction design, not an audit claiming every current interaction is broken. Source inspection establishes routes, fields, actions, and component ownership. Prior screenshots establish earlier appearance only. Static concepts do not prove animation, accessibility, current production behavior, or backend capabilities.

## Experience principles

1. Each screen has one clear purpose and a visibly preferred next action.
2. Priority, workflow status, and verification are separate signals. Category icons are decoration with meaning, not a substitute for labels.
3. Data changes do not take focus, reorder work unexpectedly, or erase entered information.
4. Server-confirmed results determine success. Never animate a rescue action as completed before confirmation.
5. Mobile is a complete task flow, not a compressed desktop dashboard.
6. Emergency guidance stays immediately accessible. No animation or sign-in transition blocks a visible configured hotline.

## Information architecture and navigation

**Staff:** persistent desktop sidebar, grouped by role-visible work. Retain existing routes; labels may become Overview, Incident map, Analytics, Audit, Teams, Users, and Assignments where appropriate. Do not expose links that the current role cannot use. Admin destinations remain within the existing admin capability until a routing change is explicitly designed and tested.

**Residents:** a simpler resident shell with My reports and Report an emergency. Do not show dispatcher navigation. Keep a configured emergency-call route available without giving it the same appearance as an ordinary app action.

**Mobile:** a compact header and labeled Menu control. The menu must support keyboard, Escape, focus return, and closing after route selection. Avoid six squeezed tabs or a permanently visible desktop rail. Preserve current location within a list when returning from a report.

**Orientation:** heading, relevant description, selected navigation, and browser title agree. Keep account identity, role, and Sign out together. Do not add fake connection indicators, notification counts, or invented keyboard shortcuts.

## Route-by-route target

| Surface and current owner | Redesigned task flow | Important states |
|---|---|---|
| Public home: `routes/Home.tsx`, `pages/Landing.tsx` | Explain the service and provide the real resident/staff entry paths supported by current routing. Lead with access choices and safety guidance; remove obsolete mobile-only assumptions after checking current content. | Signed out, signed in, unavailable hotline/app facts, privacy status |
| Sign-in and registration: `features/auth/LoginPage.tsx`, `features/resident/ResidentSignUp.tsx` | Focused form, clearly distinguished resident registration and staff access. Retain autofill, validation, real account provisioning, and relevant help. | Invalid fields, disabled account, authentication failure, submitting, success redirect |
| Dispatcher overview: `features/reports/ReportQueue.tsx` | Inbox plus selected-report preview on wide screens. Put type/location and priority first; support explicit search and quick views over actual report data. Retain full report links. | Loading, empty overall, empty filtered, retryable failure, changed/missing selected record |
| Incident details: `features/reports/IncidentDetails.tsx` | Summary and evidence, history, then role/state-appropriate actions. Reuse the same action logic for any overview preview instead of duplicating transition rules. | Verification, rejection, assignment, duplicate handling, photo viewer, stale-state conflict |
| Map and monitor: `features/map/IncidentMap.tsx`, `features/dmo/MonitorPage.tsx` | Filters scope the map; select a marker for a concise report summary and details link. Preserve meaningful marker shapes and attribution. | No visible incidents, tile failure, loading, read-only DMO, selected report outside filters |
| Analytics: `features/analytics/AnalyticsPage.tsx` | One reporting-period toolbar, coherent exports, readable distributions and a suitably wide time-series view. Keep accessible data tables. | Invalid dates, no data, loading, failed stats/export |
| Audit: `features/audit/AuditPage.tsx` | Filterable chronology with actor, action, report, time, and before/after changes. Mobile uses complete record groups. | Long identifiers/values, empty result, load failure, filtered state |
| Teams and users: `features/teams/TeamsPage.tsx`, `features/users/UsersPage.tsx` | Directory first; visible creation entry and focused editing. Separate assignment availability from account activation. Preserve real confirmation flows. | Busy team, long name, create/edit validation, permission failure, saved state |
| Responder work: `features/responder/AssignmentsPage.tsx`, `OperationForm.tsx` | Assignment summary, location, currently allowed next action, then structured progress form and history. | Acknowledge/save pending, invalid input, assignment changed, completed rescue |
| Resident overview: `features/resident/ResidentDashboard.tsx` | Visible safety notice, report action, own active reports, then rounded-location public map and notifications. | No reports, list loading/error, no notifications, permission-sensitive map content |
| Resident reporting: `features/resident/ReportForm.tsx` | One scannable form in four groups: situation, location, optional evidence, optional contact. Keep optional fields explicit. | GPS denied/unavailable, invalid photos, missing coordinates, contact-pair validation, failed submit |
| Resident report: `features/resident/ResidentReportDetail.tsx` | Clear reference, current state, saved details, and timestamped history. Cancellation uses an explicit consequence confirmation. | Submitted-only eligibility, cancel pending, server conflict, missing/error report |
| Admin: `features/admin/AdminPage.tsx` and child panels | Organize accounts/roles, teams, settings/health, and audit into identifiable sections with local actions and local feedback. Do not imply dispatcher exports are available to admin. | Team fetch failure, role/account validation, settings not loaded, save pending, health unavailable |
| Access denied/missing routes: `pages/Forbidden.tsx`, router | Explain available recovery using the actual signed-in role. Preserve route guards. | Signed out, wrong role, missing report, expired session |

## Inbox interaction contract

- At wide widths, show an inbox and detail preview; when either pane cannot retain readable content, use the single-column flow. Proposed breakpoint: 1200 CSS px, to validate with real labels and 200% zoom.
- Selecting a record updates the preview without navigating the entire app. Keep the full incident route reachable for evidence and advanced actions. Store a shareable selection using a URL query only after choosing one canonical owner for that state.
- Search and quick views are new proposed UI behavior. Derive counts from the appropriate full dataset, distinguish them from visible-result counts, and show applied filters with a Clear action.
- Preserve newest-first order unless the user explicitly selects another ordering. Critical count does not imply automatic priority sorting.
- Keyboard users can Tab to a record's explicit selection control or full-report link. Do not turn every nested control inside a row into another selection trigger. Do not introduce complex grid keyboard semantics unless implemented completely.
- If a selected report leaves the current filter, explain the change and offer Clear filters or return to results. Do not silently select another incident before a pending decision.
- Retain scroll position and filters on Back. A new report must not steal focus or scroll the reader away from their current report.

## Actions and feedback

**Pending:** change the initiating action label to a meaningful verb, prevent duplicate submissions, and preserve its dimensions. Disable only conflicting actions. Do not disable reading, emergency calls, or ordinary navigation unnecessarily.

**Success:** update from the authoritative response/subscription. Show persistent local confirmation for important changes, supplemented by a concise status announcement. Avoid success-only toasts that disappear before the user sees them.

**Failure:** keep the user's values, selected incident, and context. Put the error beside the action and name recovery. Treat a status/assignment conflict as updated information, not a generic network failure. Do not silently auto-retry a mutation.

**Confirmation:** reserve modal interruption for consequential decisions requiring protected focus: cancellation, rejection with a reason, account access changes, and assignment where the existing flow requires it. Never insert a confirmation before every ordinary edit.

**Dialogs:** retain Radix focus trapping, focus return, Escape, and existing outside-interaction restrictions where intentional. On a failed save, keep the dialog open with the entered information. Closing an editor with unsaved work needs explicit handling; closing a read-only photo viewer does not.

**Forms:** visible labels, field-level validation, an error summary when multiple fields fail, correct autocomplete/input types, and first-invalid-field focus. Resident report submission already has duplicate-request protection; retain it. No new multi-step wizard that lengthens emergency reporting.

**Hotlines:** the current app has configurable hotline/settings code. Use real loaded configuration and fallback semantics; do not keep older mockup claims that no hotline can exist. Do not fabricate a number or verified service availability.

## Motion design

Detailed execution values and source ownership are in `../plans/001-coherent-interaction-motion.md`. The character is responsive and calm: no bounce, count-up animation, idle movement, blanket page entrance, or staggered incident rows.

| Moment | Intended experience |
|---|---|
| Select report, filter, navigate by keyboard | Immediate response, stable focus, no motion delay |
| Open focused dialog | Brief opacity and small scale transition; content remains readable |
| Open mobile navigation | Short directional slide explaining where the menu came from |
| Save or submit | Immediate pending label; success only after confirmed completion |
| Expand secondary fields | Reveal in place without animating layout height or hiding focused content |
| Map refresh | Keep the existing non-animated bounds behavior; no automatic fly-through |
| Image viewer | Quiet opening transition; photo changes immediate, no carousel sweep |
| Reduced motion | Remove spatial movement; keep immediate state/focus and optional short fades |

## Visual and accessibility system

Use the complete latest palette proposal rather than mixing legacy and proposed theme tokens. Preserve urgent red and readable amber as semantic exceptions. Use Inter as the proposed typeface; the raster concepts do not establish exact font metrics. Check licensing, self-hosting, variable weights, and actual font loading before adoption.

Use 15–16px body text, at least 16px mobile form controls, moderate 30–32px page headings, 24px detail titles, and readable 13–14px metadata. Use tabular numerals for counts and times. Design zoom/reflow rather than clipping long labels to match an image.

Keep 44px touch targets, visible focus, text-and-shape state meaning, named icon controls, semantic headings, useful landmark labels, and readable chart alternatives. Test configured notices, long names, IDs, addresses, non-Latin text, zero items, many items, invalid dates, and large counts. Native map tiles retain their original colors; the palette brief does not authorize recoloring third-party maps to remove blue.

## Implementation sequence after separate authorization

1. Settle the stronger palette and produce matching phone, incident detail, resident reporting, and admin designs. Do not assume the dispatcher mockup alone settles every surface.
2. Establish one token/component owner for fonts, colors, surfaces, badges, inputs, actions, and motion. Reconcile existing CSS and shadcn aliases deliberately; avoid appended override layers.
3. Build the shared staff/resident shells, then the inbox/detail task and existing dialogs, preserving permissions and backend contracts.
4. Carry the system through maps, analytics, directories, audit, assignments, resident flows, and admin. Preserve current working-tree changes.
5. Verify actual roles, states, phones, zoom, keyboard, reduced motion, and interrupted transitions in the browser, then capture the finished screens.

## Acceptance and limits

Implementation is complete only when all listed routes use the system, actions retain their behavior, and real browser checks cover normal/error/empty/loading states. Run existing type/unit/build checks and meaningful browser regressions. Include resident report submission/cancellation, admin settings, and permission boundaries; earlier dispatcher-only checks are insufficient.

No new dependencies are needed merely to write this specification. No tests were run for these documentation-only changes. No production account, configuration, code, commit, or deployment is changed by this plan.
