# REDESIGN-SPEC: whole web product, ground up

Status: written spec, awaiting Airen's review. No code until the spec and the plan are approved (architectural path).
Date: Oct 16, 2026. Decisions from Airen: scope = whole product; depth = rewrite markup too.
Builds on: `LANDING-AUDIT.md` (option A, calm civic), `docs/design-tokens/tokens.json`.

## Decisions recorded (Oct 16, 2026)

- **Staff layout: Option B, approved.** Command toolbar with counts and filters on the dispatcher dashboard; incident details as two columns with a sticky action rail; assignments as cards. Applies to phases 4, 5 and 7.
- **Staff browser check: local Firebase emulator.** No passwords and no changes to the real `flutter-5094e` project. Replaces the real-project sign-in in `REDESIGN-PLAN.md` phase 8, step 4, which must be revised when the plan is updated. Not yet verified that the emulator runs with seed data here.
- **Open questions 1-3 below:** still on their defaults (no answer given).

## Goal

One product, one look. A resident-facing public site and a staff web app that read as the same system. The staff app should look like a working operations tool: calm, dense where it has to be, and clear about status and priority.

## Scope

In scope, every screen in `web/src`:

| Area | Screens |
|---|---|
| Public | Landing (`/`), staff sign-in (`/login`), access denied (`/forbidden`) |
| Dispatcher | Dashboard (queue + summary), Map, Analytics, Audit log, Teams, Users, Incident details |
| DMO | Monitor, Analytics, Incident details (read) |
| Responder | Assignments, operation form |
| Shared | Shell (sidebar, top bar), status and priority badges, assign-team dialog, cards, tables, forms, empty and error states |

Out of scope:
- The Flutter resident app (separate project, `mobile/`).
- Any API, routing, role, or data change. Routes and role gates stay as they are.
- Stock photography (not licensed; would need Airen's own photos).

## Design system

- **Colour:** the calm civic tokens in `tokens.css`. Harbor `#123B39` for the sidebar and header bands; teal `#0F6B66` for the primary action only; paper `#FAFAF7` for the page; white panels with a mist `#E9EFEE` border; ink `#1D2B2A` text.
- **Coral `#C83919`:** hotline and critical priority only. Ordinary errors never use it.
- **Amber `#9E5A00`:** high priority, notices, and warnings.
- **Type:** Geist only. The app's `system-ui` fallback is removed from `body`. Scale: 28 / 22 / 18 / 16 / 14 px. Body 16 px, line height 1.5.
- **Spacing and radius:** 8 px grid. Radius 12 px controls, 20 px panels. Touch targets 44 px.
- **Motion:** one entrance on the landing page only. Respect `prefers-reduced-motion`.

## Layout

- **Staff shell:** harbor sidebar (brand, primary nav, signed-in role at the bottom), white top bar (page title, user, sign out), paper content area with a 1200 px max width.
- **Mobile staff layout:** sidebar collapses to a top bar with a menu button. Tables become stacked rows below 640 px.
- **Landing:** as built in `cbd888f`, with a stronger staff-app family resemblance. Front-door cards and safety band stay where they are.

## Phases (one commit per phase, tests green at each)

1. **Foundation:** tokens, base type, shared components (Button, Card, Badge, Field, Table, EmptyState, Banner). Unit tests for each.
2. **Shell:** AppShell and navigation, mobile menu. Role nav tests unchanged.
3. **Public pages:** landing, sign-in, access denied, all on the foundation components.
4. **Dispatcher queue and dashboard:** ReportQueue, SummaryCards, filters.
5. **Incident details and assign-team dialog.**
6. **Map, analytics, monitor, audit.**
7. **Teams, users, responder assignments and operation form.**
8. **Checks:** full test suite, typecheck, build, browser check at 375 px, 768 px, and 1440 px in Chromium, Firefox, and WebKit, with screenshots reviewed.

## Test impact

- Existing 142 tests: most assert text and roles, so they should survive markup changes. Any test that breaks because a label moved gets updated in the same commit, and the change is called out.
- New tests: foundation components, the mobile menu, and the empty and error states.

## Risks

- **Scale:** about 20 screens. Phase 4 onward is the bulk of the work.
- **Staff screens cannot be seen without signing in.** I can check them with the test seeds on `flutter-5094e` (dispatcher, responder, dmo accounts). Note: the test accounts are real Firebase users, so signing in only reads data. I will not change any data.
- **Map tiles** need a network connection and may not render in headless checks. I will say so if that happens.

## Open questions (answer or accept the default)

1. **Phone staff layout:** collapse the sidebar into a menu button (default), or a bottom tab bar for the three most-used screens?
2. **Dashboard density:** a full table (default), or cards per report?
3. **Sign-out and role label:** keep the role in the top bar (default)?

## Not checked

- A real phone. Safari on iOS. Live Firebase data beyond the seeded test reports.
