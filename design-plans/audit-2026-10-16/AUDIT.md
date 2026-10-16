# Website UI/UX audit

Prepared for Airen, October 16, 2026. Local revision: `3a2ea076dd6bd08f808f582c2f97072128bf032a`, with the pre-existing HANDOFF and REDESIGN-SPEC edits preserved.

## Verdict

The website needs a layout and workflow redesign. Its most visible weakness is information hierarchy: things are rendered because the feature exists, with too little consideration for what the person needs to see or do first. Recoloring the existing pages does not solve that.

The navy/blue palette is usable. The staff pages repeatedly spend space on counters, empty space, large forms, and outlined badges while compressing the operational information. Some problems are actual rendering failures, including the invisible map and mobile overflow. The public page is more composed, but remains heavy on explanatory text and unfinished destinations.

These are observations of this implementation, not judgments about its author's ability. The visual recommendations below are design judgments; numeric measurements and behavior checks are identified separately.

## Coverage and method

- Inspected the deployed public `/` and `/login` at `https://disaster-rescue-web.vercel.app`. Both display the older sign-in experience. The local public landing page is not what that deployment currently serves.
- Inspected all local web routes: public landing, login, forbidden, dispatcher dashboard, incident details, map, analytics, audit, teams, users, DMO monitor and read-only incident details, responder assignments and operation form.
- Captured desktop, tablet, and phone layouts at 1440, 768, 390, and 320 CSS pixels, with a 900 px viewport height. Captured submitted, awaiting-assignment, active, missing-report, filtered-empty, dialog, and operation-form states.
- Exercised filters, mobile navigation, assignment/rejection dialog opening and Escape, sign-in/out, failed sign-in, the resident-app anchor, a schema-limit staff name, reversed analytics dates, and a simulated local teams API failure.
- Used real Firebase Auth/Firestore emulators and the existing Express app/repository adapter with synthetic audit accounts, reports, teams, and audit entries. All staff data in the screenshots is synthetic. No production account was used or production record changed.
- Firestore's normal port 8080 was occupied. The audit used 8180 and changed only the served development Firebase module's port in browser interception. Product source files were not edited. The audit API used an emulator-only token verifier; uploads and external notifications were not exercised.
- There are 80 screenshots, browser measurements, interaction results, and console records in this directory. See `screenshots.html` for the image index.

This was a Chromium inspection, not a physical-phone, Safari, Firefox, screen-reader, penetration, or load test. Not every business mutation or backend failure was exercised. The map's zero-height failure prevented meaningful geographic interaction checks. The local browser captured no console warnings/errors during the main successful route pass; this does not establish that all other environments are error-free.

## Design language and current ownership

- **Audited application:** the React/Vite website in `web/`, including its public and three staff-role surfaces. Flutter is outside this audit.
- **Implemented direction:** public-safety navy, blue, off-white, white surfaces, red for critical priority/hotline, amber for higher priority/notices.
- **Relevant owners:** `web/src/theme/tokens.css`, `web/src/styles.css`, `web/src/components/calm/calm.css`, `web/src/pages/public.css`, and `web/src/layout/AppShell.tsx`.
- **Design intent:** the latest HANDOFF records public-safety colors and approved staff layout Option B. REDESIGN-SPEC is explicitly awaiting review and still describes the earlier teal/harbor palette in its body. It describes future work; it is not proof that the layouts are implemented.
- **Observed exceptions:** public pages explicitly select Geist; the staff body inherits system-ui. No accepted exception explaining that difference was found.

The review should preserve role boundaries, data rules, and useful safeguards. It should not preserve every current card or layout just because it already exists.

## Technical health assessment

These are provisional engineering ratings for the sampled website, not a usability-study result or accessibility certification.

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 2/4 | Labels, native controls, focus outlines, dialog focus return, and chart data tables are useful foundations. Whole-page overflow and broken badge words impede reading. Full assistive-technology/contrast coverage was not performed. |
| Performance | 2/4 | Production build succeeds, but ships a single 1,533.85 kB JS bundle, 461.41 kB gzip, including eagerly imported staff charts/maps. No field loading-speed result is claimed. |
| Theming/system consistency | 2/4 | Reusable tokens/components exist. Public/staff type differs and old/global/new styling owners overlap. A dark theme is not a stated requirement; lack of a theme toggle is not a finding. |
| Responsive layout | 1/4 | Audit log overflows even at tablet width; narrow analytics and incident layouts also overflow; valid long names break user management. |
| Implementation integrity | 1/4 | Invisible maps, contradictory counters, unfinished public destinations, and stale browser tests remain despite passing unit tests. |
| **Total** | **8/20** | **Major work required.** |

## Findings, in priority order

### 1. P0: The map and DMO monitor have no visible map

**Measured:** `.leaflet-container` is **0 px high** at all four widths, while the interface says “8 located reports shown.” The DMO monitor shares the same failure. This is not a missing-tile-network diagnosis: the container itself has no height.

**Source:** `web/src/features/map/IncidentMap.tsx`, especially the `.incident-map` wrapper and `MapContainer` with `height: '100%'`. No matching `.incident-map` sizing rule exists in the loaded CSS.

**Impact:** a central monitoring task cannot be performed visually. **Need:** give the map an explicit responsive containing block, restore marker presentation/legend, then verify zoom, selection, fitting incident bounds, and keyboard alternatives. This must precede cosmetic work on the map.

Evidence: `screenshots/map-1440.png`, `screenshots/monitor-1440.png`, `browser-results.json`.

### 2. P1: The incident queue breaks important words inside badges

**Observed:** at 1440 px, “Critical,” “Verified,” and “Pending” break across lines inside their pills. Full-length underlined descriptions consume the report column, leaving too little room for the status columns. At tablet width the competition is worse.

**Source:** `web/src/features/reports/ReportQueue.tsx` and `web/src/components/calm/calm.css`: every cell uses `overflow-wrap: anywhere`, badge text can shrink, and column sizing is unconstrained.

**Impact:** staff must reconstruct the exact information they should scan fastest. **Need:** a deliberate column budget; unbroken badge labels; concise incident summaries with full content in details; useful incident identity/location; and a stronger distinction between the report link and descriptive text. Keep full content accessible, rather than simply cutting it away.

Evidence: `screenshots/dashboard-1440.png`, `screenshots/dashboard-768.png`.

### 3. P1: Responsive layouts expand the whole page

**Measured:** audit log scroll width is **578 px at 390 px** and **842 px at 768 px**. Analytics is **332 px at 320 px**. Submitted incident details reach **327 px at 320 px**. A schema-limit 100-character staff name produces **978 px at 390 px**.

**Source:** shell grid sizing in `styles.css`, audit's intrinsic table width, `.analytics-grid`'s 300 px minimum, duplicate-panel sizing, and user-row/action text in `UsersPage.tsx`.

**Impact:** the entire application pans sideways; labels and actions leave the viewport. **Need:** allow the shell/body to shrink, contain table scrolling or use a mobile record presentation, make minimum columns fit available width, and wrap long identity/action text. Validate accepted field lengths, not only short demo names. The long-name screenshot is a deliberate boundary stress case, not a normal production record.

Evidence: `screenshots/audit-390.png`, `screenshots/analytics-320.png`, `screenshots/incident-submitted-320.png`, `screenshots/users-invalid-390.png` (the historical filename; it actually shows an accepted long-name record).

### 4. P1: “Open” and “Ongoing” disagree

**Measured:** the same eight-report dataset produces **Ongoing 6** and **Open 7** on the same dashboard. Total reports and All reports both show 8.

**Source:** `SummaryCards.tsx` uses API stats. `api/src/services/statsService.js` excludes Resolved from open reports. `ReportQueue.tsx` uses `web/src/features/reports/format.ts:isOpen`, which does not exclude Resolved.

**Impact:** the user cannot infer a reliable workload count from the page. **Need:** decide and document whether a resolved-but-not-closed report remains operationally open; align labels, counts, filtering, and eligibility with that definition. This is a domain decision as well as a UI fix. Do not merely rename a counter to conceal the contradiction.

Evidence: `screenshots/dashboard-1440.png`.

### 5. P1 for real public use: The strongest public action dials a placeholder

**Observed:** the red header link has `href="tel:000-0000"`. The footer also displays that placeholder.

**Source:** `web/src/components/PublicHeader.tsx` and `Landing.tsx` hard-code it separately.

**Impact:** emergency styling signals a usable urgent action that is not available. The placeholder is honestly labeled, but should not be a dialable emergency control. **Need:** use a verified project hotline from a shared owner, or present a non-actionable demo state until it is available. This is a release blocker for actual emergency use, not a demand to invent a number for a school demo.

### 6. P2: Incident details bury the core task

**Observed:** the duplicate-comparison panel precedes the main report and occupies most of the desktop's first screen. Report facts, updates, and action controls form a long vertical sequence. In the 1440 px screenshot, Verify/Reject sit around 1,350 px down the document; phone users scroll farther. The page heading is only “Incident details,” so it contributes no incident identity or urgency.

**Source:** `IncidentDetails.tsx`, `.incident`, `.dup`, and `.actions` in `styles.css`.

**Need:** use the approved Option B concept: an identifying incident header, a primary evidence/details column, and a visible action rail on desktop. On phones, prioritize status, location, contact, and next action before secondary comparisons. Duplicate review remains visible when relevant but should not displace the report. Photos currently appear only as “Photo 1” links; evidence thumbnails and an intentional viewer would reduce context switching.

Evidence: `screenshots/incident-submitted-1440.png`, `screenshots/incident-submitted-390.png`.

### 7. P2: The dashboard gives summaries more priority than the queue

**Observed:** eight equally treated metric cards form two rows. On a 390 px phone, they form four rows before filters and the first incident. The interface gives repeated totals more prominence than the reports staff came to assess.

**Source:** the `/dashboard` composition in `App.tsx`, `SummaryCards.tsx`, and `ReportQueue.tsx`.

**Need:** one compact summary/command area, with non-duplicated metrics and a visible queue heading/count. Make filtering easy to inspect and reset. Prioritize unresolved workload and urgency explicitly; choose any priority-versus-recency sorting rule with the product owner instead of silently changing the operational policy.

### 8. P2: Teams and users are designed around forms rather than management

**Observed:** a large creation form appears before the existing records. Every team is already an edit form, in a wide card with substantial unused horizontal space and a prominent Save name button. User rows underline names and emails even though those elements are spans, not links. Account deactivation competes visually with primary navigation/actions.

**Source:** `TeamsPage.tsx`, `UsersPage.tsx`, and the reused `.queue__link`, `.queue__row`, and `.ops-form` rules.

**Need:** a list-first management page with compact role/status/team information and explicit Create/Edit actions. Editing should be an intentional mode. Reserve link styling for links; use visible action labels appropriate to the task. Choose confirmation/recovery rules for destructive account actions deliberately.

Evidence: `screenshots/teams-1440.png`, `screenshots/users-1440.png`.

### 9. P2: Typography has no consistent hierarchy across the product

**Observed:** public pages use Geist; staff pages use system-ui. Several staff section headings look like ordinary body text. Labels, explanatory text, and important facts compete at similar sizes/weights.

**Source:** public wrapper font in `public.css:2`, body font in `styles.css`, Tailwind preflight, and staff headings without a component style. Importing a font does not make staff pages use it.

**Need:** one intentional product type family and a small explicit hierarchy for page titles, section titles, incident identifiers, form labels, body, and metadata. Keep any public/staff variation purposeful. This does not require replacing Geist simply because a detector considers it common.

### 10. P2: Badges create noise without enough semantic distinction

**Observed:** Submitted, Awaiting Assignment, Rescue in Progress, Resolved, and Closed all use the same blue outline treatment; verification is also blue. Different Unicode symbols introduce inconsistent shapes and occasional emoji rendering. Three outlined pills repeat in nearly every queue row.

**Source:** `StatusBadge.tsx`, `PriorityBadge.tsx`, `VerifiedBadge.tsx`, and overlapping `.badge` definitions in `calm.css` and `styles.css`.

**Need:** a semantic status system with stable text, restrained color/surface differences, consistent icon sizing, and enough room for complete labels. Preserve the text and non-color cues. Let priority draw attention; ordinary statuses should support scanning instead of competing with it.

### 11. P2: The analytics page does not help interpret its charts

**Observed:** at desktop width three equal chart cards compete in one row; long status labels are omitted by the chart axis, while the full data tables below compensate. Chart/table vertical spacing varies substantially between cards. There is no short explanatory summary of the selected range. A reversed From/To interval is accepted and presented as “No data for this range” in all three charts.

**Source:** `AnalyticsPage.tsx`, `ChartCard.tsx`, and `.analytics-grid`/`.chart-card` in `styles.css`.

**Need:** validate date order inline, state the selected period, choose chart layouts that fit category labels, and prioritize the question each chart answers. Keep the accessible data-table alternative. Exports should be secondary to understanding the data, not the most visually prominent feature.

Evidence: `screenshots/analytics-1440.png`, `screenshots/analytics-reversed-range-390.png`, `interaction-results.json`.

### 12. P2: Mobile navigation consumes space and stays expanded after navigation

**Observed:** mobile staff pages have both a brand/menu band and a separate account/sign-out band before the page heading. On short pages such as the missing incident and map/monitor views, the brand band also stretches into a large empty navy block. The mobile shell changes to one grid column without constraining its implicit row sizing, so the minimum viewport height is distributed into the navigation area. Clicking Menu, then Map, leaves `aria-expanded="true"`. Incident detail pages have no selected navigation context. Even responders with one navigation destination get the same large sidebar/menu structure.

**Source:** `AppShell.tsx` stores menu state without closing it on route change; the shell styles apply the same layout to every role.

**Need:** a compact mobile app bar with content-sized navigation rows, clear page/location context, and a menu that closes after selecting a destination. Preserve accessible names and keyboard access. Adapt navigation to role complexity without creating a different product identity.

### 13. P2: The public page explains the system before helping the visitor use it

**Observed:** the long formal system name dominates the hero. Both audience cards receive similar weight, but the resident path ends at an unavailable-app notice. The role list repeats information already introduced in the cards. The workflow is six similar decorative tiles with a weak visible connection. Privacy is only “pending review”; credits are unfinished.

**Source:** `Landing.tsx` and `public.css`.

**Need:** a concise useful introduction, immediately honest access options for residents and staff, a shorter workflow explanation, and finished contact/privacy/demo information appropriate to the actual release. A stronger composition can use real app screens or real geographic context if available. Stock photos, decorative animation, and invented impact numbers are not required.

Evidence: `screenshots/landing-1440.png`, `screenshots/landing-390.png`.

### 14. P2: Login and access-denied pages lack task-specific help

**Observed:** the local login is a small generic form in a largely empty page. Its supporting copy is a resident rescue disclaimer, rather than staff access guidance. The unauthenticated forbidden page tells the visitor their account lacks permission but provides Sign out rather than a clear Sign in or return path.

**Source:** `LoginPage.tsx`, `Forbidden.tsx`, and `public.css`.

**Need:** identify this as staff sign-in, explain how staff obtain/recover access through the project's actual process, and give denied/signed-out visitors a relevant recovery action. Preserve the necessary emergency disclaimer in an appropriate place. Do not invent password-reset capability that the product does not have.

### 15. P2: Errors explain failure but often provide no recovery control

**Observed:** a simulated local `/teams` failure displays “Check your connection and try again,” with no Retry button. The create form remains above it. Queue and several other load-error states follow the same explanatory pattern. A failed sign-in does provide a clear alert; that is a useful foundation.

**Source:** `TeamsPage.tsx:load`, `ReportQueue.tsx`, and related load branches.

**Need:** distinguish empty results, failed loads, disconnected/stale data, and loading. Give recoverable failures an actual retry path and preserve entered values. For a live operations interface, choose a visible freshness/connection treatment; do not imply that a disconnected view is current.

Evidence: `screenshots/teams-api-error-390.png`, `screenshots/login-error-390.png`.

### 16. P2: Initial loading includes every major staff feature

**Measured:** production build outputs one **1,533.85 kB JS file, 461.41 kB gzip**, plus CSS/fonts. `App.tsx` eagerly imports charts, maps, public pages, and all staff routes.

**Impact:** public visitors and sign-in users must load code for unrelated staff features. **Need:** route-level splitting with useful loading states. Measure the result on a throttled phone/network before claiming a loading-speed improvement. CSS animation optimization is not the main performance issue found here.

### 17. P2: Existing browser smoke tests target the old homepage

**Source:** `web/e2e/login.spec.ts` visits `/` and expects a Sign in heading. The local homepage now renders the public landing. The visual comparison tests also retain that older assumption and are skipped unless a baseline URL is supplied.

**Need:** update smoke coverage to the actual public landing and `/login`, add representative authenticated browser coverage with isolated data, and add targeted layout assertions for visible maps, readable labels, and viewport overflow. Unit tests should continue checking behavior; browser checks must cover what people actually see.

Execution results are recorded in the verification section below. Passing unit tests alone did not detect the map or mobile failures.

## What is worth keeping

- The navy/blue/red/amber palette can support this product; a wholesale rebrand is unnecessary to fix the main failures.
- Native labeled form controls and mostly 44 px primary controls provide a useful starting point.
- The assignment dialog returns keyboard focus to its trigger on Escape in the exercised flow.
- Text labels accompany status/priority symbols; do not replace these with color-only indicators.
- Chart data tables, role-based routing, filter URL state, and explicit error messages are useful foundations.
- The project already has a reusable component/token layer. It needs consolidation and deliberate page composition rather than another parallel design kit.

## Recommended order of work

1. **Stabilize the interface:** visible maps, page-width containment, unbroken status/priority labels, consistent workload counts, safe demo hotline treatment.
2. **Design three representative screens before scaling out:** dispatcher dashboard, incident details, and responder assignments, each at desktop and phone widths with populated data. These expose the product's density, hierarchy, actions, and status system. Use actual content lengths and edge states.
3. **Approve one foundation:** type hierarchy, surface/spacing/radius rules, action hierarchy, semantic badges, compact navigation, and clear loading/error/empty states. Reconcile the stale design spec with the accepted direction.
4. **Apply it to management and reporting:** list-first teams/users, a readable audit trail, and analytics with useful chart labeling/range validation.
5. **Finish the public experience:** honest app availability, usable emergency contact state, staff guidance, privacy/credits, and a landing composition that gets people to a real next step.
6. **Validate and polish:** populated browser coverage, responsive/keyboard/error checks, route loading, and a final consistency pass. Do not spend the first pass adding animation or changing libraries.

For subsequent Impeccable work, the relevant order is `$impeccable harden`, `$impeccable adapt`, `$impeccable shape`, `$impeccable layout`, `$impeccable typeset`, `$impeccable clarify`, `$impeccable optimize`, then `$impeccable polish`. This audit does not authorize deployment or replace the project's design-approval process.

## Verification and detector interpretation

- `npm test` in `web`: **170 tests passed across 25 files**, including typecheck.
- `npm run build -- --outDir /tmp/rescue-audit-build`: **passed**; bundle-size warning noted above.
- Main browser route pass: **77 captures**; targeted interaction follow-up: **3 captures**.
- Existing login browser tests: **3 failed**. Each visits `/` and expects the obsolete Sign in heading; the current local `/` is the landing page. These failures occur before the tests can establish their intended login/layout assertions. Details: `verification.json`, traces under `/tmp/rescue-audit-e2e`.
- Impeccable source detector completed with six style warnings. It flagged accent borders and Geist. Those warnings do not prove bad UX: a warning border can have a valid notice purpose, and a commonly used font can be appropriate. The badge wrapping, zero-height map, overflow, and conflicting counts were established independently from browser/source evidence, not inferred from detector taste rules.
- Product source was left unchanged. Audit artifacts are under `design-plans/audit-2026-10-16/`. Temporary local services were used for inspection and stopped after the audit.

## What Airen needs to supply or decide

- Confirm the operational meaning of Resolved versus Closed for the queue and summary counts.
- Provide the verified local hotline if this is to be presented as usable outside a demo.
- Decide whether the resident app is distributed as a demo APK, publicly released, or unavailable; label the public destination accordingly.
- Supply final team/course credits and the reviewed privacy text when ready.
- Review the three representative redesign screens before a whole-product rollout. A new framework, another plugin bundle, paid assets, and a different palette are not prerequisites.
