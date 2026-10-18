# Whole-product redesign completion audit

For Airen · October 17, 2026 · source baseline `effd53f` plus the existing working tree.

## Conclusion

The requested whole-product visual revamp is incomplete. The approved dashboard illustration established a direction, but it did not establish finished designs for every screen. Functional repairs, synthetic content, shared colors, and one redesigned dashboard do not satisfy the requested outcome.

This is a completion audit and implementation handoff, not a claim that every current screen has been freshly tested. Application source was left unchanged. Existing uncommitted repairs and demo work must be preserved.

## Evidence and limits

- Fresh public landing captures: local Vite and the live site, at 1440px and 390px. See [browser evidence](browser-evidence.json) and [screenshots](screenshots/).
- At each width, local and live PNGs are byte-for-byte identical. Both returned HTTP 200, had no recorded JavaScript page errors, and had no horizontal overflow. This proves landing parity at capture time, not that every deployed route or build revision matches local source.
- `Landing.tsx` and `public.css` have no changes since `e9c6426`. See [source evidence](source-evidence.txt). The landing still contains the text-only hero, two access cards, dot timeline, role descriptions, repeated app availability notice, and a privacy placeholder.
- Current web scope was enumerated from `web/src/App.tsx`; native scope from `mobile/lib/features` and `mobile/lib/theme/app_theme.dart`. Protected routes and native screens were not freshly rendered in this pass. Their visual completion remains unverified; route inventory is not a screenshot audit.
- The October 16 predeployment audit contains earlier protected-route evidence and technical findings. Later repairs exist. Do not label those findings still broken without checking the current implementation.

## Design language

- Audited surface: whole-product completion, with fresh rendered proof for the public landing.
- Accepted visual references: `design-plans/dashboard-concept-v11-final-web.png` and `design-plans/mobile-concept-v2-refined.png`. These are concept images, not implemented-product screenshots. The dashboard reference does not define a public landing layout.
- Documented decisions: Airen accepted the stronger indigo/violet direction, delegated design decisions, and now explicitly requires the entire website and mobile app.
- Governing owners and consumers: web `theme/tokens.css`, `layout/AppShell.tsx`, `styles.css`, public/auth/resident layouts and feature pages; Flutter `theme/app_theme.dart` and feature screens. Share identity while adapting composition to each task.
- Explicit exceptions: none documented for the current whole-product request. Earlier pass-specific exclusions are historical scope, not permission to omit screens from this handoff.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | The public landing still presents the previous composition despite the requested revamp. | Fresh local/live desktop and phone captures match; `Landing.tsx` and `public.css` have no post-`e9c6426` changes. Airen explicitly rejects the current plain landing. | Replace its composition using the landing brief below and verify the actual rendered result. | `/`, public header/footer and responsive behavior | High |
| 2 | The implementation brief narrowed a whole-product request to a dispatcher overview. | `docs/superpowers/specs/2026-10-16-website-redesign-design.md` names dispatcher overview goals and excludes Flutter; the accepted rendered concept is also a dispatcher dashboard. Current request explicitly includes the entirety. | Use a mandatory per-screen completion ledger covering every row below. | Every web route, native flow, shared UI and states | High |
| 3 | Native theme implementation has not adopted the accepted visual direction. | Current `mobile/lib/theme/app_theme.dart` sets primary `0F6B66` and background `F6F1EA`; the accepted mobile reference and requested scope extend the new visual identity to native. Source proves theme values, not current device appearance. | Reconcile the Flutter theme and its consumers with the accepted mobile direction, then verify on device/emulator. | Native theme, all screens and overlays | High for source mismatch; native rendering unverified |

## Improve first

Redesign the public landing first: it is the freshly verified gap and the screen Airen specifically identified. It is the first implementation milestone, not the full deliverable. Continue through the entire inventory before reporting whole-product completion.

## Implementation decision and reuse

Keep the accepted indigo/violet identity; replace unfinished page compositions rather than applying another global palette pass. Preserve product truth, permissions, working API behavior, current security repairs, and owner-scoped offline drafts. Reuse the current web token owner, AppShell, ResidentLayout, existing form controls, status components, and `components/calm/Skeleton.tsx` where appropriate. Extend these owners instead of adding an unrelated second UI system. The dashboard is an identity exemplar, not a universal page template.

### Landing brief

Build a composed public product introduction: compact brand/navigation, a decisive hero with resident reporting/access and staff access, a clearly labeled illustrative product scene, a concise explanation of the report lifecycle, audience-specific benefits, honest app availability, and a purposeful footer. Put returning-resident sign-in within the resident path rather than requiring them to infer that a staff-labeled link is also theirs. Keep primary actions visible early on phones.

Use contrast, typography scale, spacing, and a substantial product visual to create hierarchy. A schematic incident-to-response scene can be built with existing UI and icons; it must be marked illustrative and must not expose real operational data. Avoid replacing the old repeated sections with another wall of equal cards. Decorative elements must support the product story. No fabricated response-time claims, government endorsement, live incident totals, hotline numbers, app-store availability, or privacy assurances. Resolve the privacy placeholder using reviewed factual content or an honest pending state; do not invent policy.

### Required web completion ledger

Every row needs an actual implementation review and fresh after-capture. “Covered by shared CSS” is insufficient evidence. Exact current feature owner paths should be confirmed before editing.

| Route / surface | Required redesign outcome | Required interaction/state proof |
| --- | --- | --- |
| `/` | New public composition described above; coherent desktop and phone layouts | Resident/staff entry, anchors, app availability, footer, signed-out rendering |
| `/login` | Intentional access screen with clear account audience and readable form hierarchy | Validation, submitting, failed credentials, session restore, resident/staff destination |
| `/register` | Welcoming resident registration with clear requirements and next step | Field errors, submitting, duplicate account, recovery, successful continuation |
| `/forbidden` | Designed access explanation with a permitted way forward | Correct role context, sign-out/home navigation |
| `/my` | Resident reporting hub with prominent report action and meaningful status summary | No reports, active/history, notifications where currently supported, refresh/error |
| `/my/report` | Clear report workflow with grouped fields and deliberate review/submit area | Location and photo states, validation, pending submission, failed retry, success |
| `/my/reports/:id` | Readable resident status, submitted evidence, and response history | Long history, missing image, unknown/deleted record, role-safe content |
| `/dashboard` | Finish the accepted dispatcher workbench as working UI | Queue filters, selection, priority/status distinction, loading/empty/error, narrow layout |
| `/incidents/:id` | Task-oriented incident workspace with situation, evidence, timeline and permitted next action | Verify/reject/assign/status controls as authorized; pending/error/success and dialogs |
| `/monitor` | DMO overview designed for monitoring rather than a dashboard clone | Current summaries, filtering, no-data/error, navigation and allowed actions |
| `/map` | Map-centered workspace with usable incident list, legend and selection | Loading/map failure, no coordinates, clusters/overlap, phone panel and keyboard access |
| `/analytics` | Deliberate analytical hierarchy with readable charts and definitions | Date/filter controls, no-data/error, export feedback, narrow chart/table behavior |
| `/audit` | Scannable event history with actor/action/time hierarchy | Filters, pagination, long values, no results, retry and timestamp clarity |
| `/teams` | Resource management with availability, membership and clear actions | Search/filter, empty states, edit/create dialogs, validation and failed save |
| `/users` | Account and role management with readable identity/status | Long names/email, role-change confirmation, save/revoke feedback and permission boundaries |
| `/assignments` | Responder workspace emphasizing the next assignment action | No assignments, acknowledgment, progress updates, failed action and stale data |
| `/admin` | Administrative overview with purposeful grouping and clear destinations | Every existing admin section, tables/forms/dialogs and permitted actions |
| Shared web surfaces | Sidebar, masthead, resident navigation, public header/footer, inputs, tables, tabs, dialogs, notices and feedback | Active/focus/disabled/pressed states; session loading/expired; route fallback; responsive drawer |

Role variants are part of coverage: resident, dispatcher, DMO, responder, and admin. An admin rendering alone does not prove the other roles have correct actions or navigation.

### Required native completion ledger

| Screen / flow | Required redesign outcome and verification |
| --- | --- |
| Sign-in and registration | Match the mobile identity, readable validation and keyboard-safe action placement; verify busy/error/recovery |
| Resident home and bottom navigation | Deliberate action/status hierarchy, selected navigation and safe-area behavior |
| Four-step report flow | Preserve all four real steps: what, where, details, review. Design progress, location permissions, map/picker, photos, validation and final submission |
| Submission result | Distinct confirmed success versus retryable failure; preserve duplicate-submission protection |
| My reports and report/status detail | Readable incident list, timeline, evidence and empty/loading/error states |
| Profile | Clear account details, supported actions, sign-out and long-value handling |
| Notifications | Readable grouping, read/unread distinction, navigation, empty/error/refresh behavior |
| Incident map | Touch-usable controls, markers, selected detail, permission/no-coordinate/error states |
| Responder assigned list | Urgency and next action; empty/loading/error/refresh states |
| Responder incident detail and operation form | Evidence/status hierarchy, acknowledgment/progress, validation, pending and failed updates |
| Offline help, drafts and role-gate states | Honest connectivity, retry and recovery guidance; preserve account isolation and draft integrity |
| Shared native surfaces | App bars, sheets/dialogs, buttons, fields, status badges, skeletons, feedback, safe areas and text scaling |

### States, motion and content

- Match skeleton geometry to each real screen; use skeletons only when structure is known. Preserve content during background refresh. Handle empty, filtered-empty, error, unavailable, permission-denied and offline states distinctly.
- Define shared motion purpose and tokens, then review drawers, dialogs, tabs, selection, toasts, submission and navigation. Verify interrupted transitions, reduced motion and focus restoration. Avoid continuous decorative motion in operational views and avoid animation that delays emergency actions.
- Keep priority and status distinguishable by text/icon as well as color. Verify keyboard access, visible focus, dialog focus, contrast, touch targets and readable chart/table alternatives.
- Synthetic content must remain visibly demo content, internally consistent, and isolated from production. Landing illustrations may use labeled sample data; invented operational claims are not filler.

## Validation and completion gate

1. Record a baseline and completion entry for every inventory row: owner files, substantive layout changes, role, viewport/device, exercised states, and before/after evidence paths. Identify routes discovered beyond this inventory and include them.
2. Web: render all routes at 1440px and 390px, plus representative complex layouts at 1024px and 768px. Test long values, large counts, empty data and failed requests. Use isolated accounts and local demo services for mutations.
3. Native: render every flow in an emulator/device, with small/large screens, keyboard, safe areas and increased text size. If unavailable, report native rendering blocked and do not claim native completion.
4. Run `npm run test` and `npm run build` in `web`; appropriate Playwright journeys; `flutter analyze` and `flutter test` in `mobile`. If API/rules change, rerun their relevant checks. Record actual results and distinguish pre-existing failures.
5. Compare the current product against the accepted references and this screen checklist. A passing test suite, generated mockup, populated database or changed token file cannot substitute for a rendered visual review.
6. Reconcile current product/design documentation after implementation: `PRODUCT.md` still says residents use a separate app even though web resident routes exist; older landing/spec exclusions conflict with the current scope. Mark superseded documents clearly rather than letting them narrow this task again.
7. No commit, push, production data mutation or deployment is included in this handoff. Prepare a reviewable result and report remaining limitations precisely.

## Stop conditions

Preserve current work before resolving conflicting edits. If a proposed visual change requires a new permission, fabricated fact or altered incident lifecycle, keep existing behavior and document the decision needed. Missing native hardware or credentials blocks verification of that surface, not independent redesign work elsewhere. Do not stop after the landing or dashboard and describe the entire product as finished.
