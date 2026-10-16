# Whole-product redesign implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Commit after each phase (CLAUDE.md rule). Run `npx vitest run`, `npm run typecheck`, and `npm run build` in `web/` before each commit.

**Goal:** Rebuild the public pages and every staff screen on one calm civic design system, rewriting markup where the layout needs it, without changing routes, roles, or data.

**Architecture:** Shared primitives in `web/src/components/calm/` (Card, Badge, Field, DataTable, EmptyState, Banner, PageHeader), plus the existing shadcn Dialog in `web/src/components/ui/`. Tokens in `web/src/theme/tokens.css` (already set). Each screen is rebuilt on those primitives. Styles move from the flat `web/src/styles.css` into the primitives' own CSS files, with `styles.css` kept only for globals and layout shell.

**Tech Stack:** React 18+, TypeScript, Vite, Tailwind (already imported, not required), plain CSS, Vitest + Testing Library, Playwright (for final browser check).

**Spec:** `REDESIGN-SPEC.md` (approved Oct 16, 2026). Defaults applied for open questions: phone sidebar becomes a menu button; dashboard is a full table; role shown in the top bar.

**Execution:** Native, in this session. The tasks share one stylesheet and one set of primitives, so a fresh reviewer per task would cost more than it catches. One whole-branch review at the end.

## Global Constraints

- Routes, role gates, API calls, and Firestore access do not change.
- Coral `#C83919` is used only for the emergency hotline and critical priority. Ordinary errors never use it.
- Teal `#0F6B66` is the primary action only.
- Font: Geist only. No `system-ui` in body or headings.
- Safety text is exact: "Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline."
- Hotline placeholder stays `000-0000` until Airen confirms the real number.
- No em dashes in user-facing text.
- Every existing test passes at the end of each phase. A test that breaks because a label moved is updated in the same commit, and the commit message says so.

## Review Focus

- Long report descriptions and long names overflow narrow phones. Test: a 600-character description renders with no horizontal page scroll at 375 px.
- Empty states on every list (queue, teams, users, audit, assignments) show a message and a next step, not a blank table.
- Keyboard focus is visible on every button, link, and table row action.
- Priority and status are never shown by colour alone. Each badge has a text label.
- Map screen with no GPS data does not crash and shows the empty state.

---

## Phase 1: Design primitives

> **Revision (Oct 16, 2026, during execution):** `web/src/components/ui/` already holds shadcn components (button, dialog, input, label, select, table), and the app styles buttons with the `.btn` class on every screen. So: no new Button component. `.btn` variants are restyled in `calm.css`. shadcn Dialog stays. Everything else below is unchanged.


**Files:**
- Create: `web/src/components/calm/Card.tsx`, `Badge.tsx`, `Field.tsx`, `DataTable.tsx`, `EmptyState.tsx`, `Banner.tsx`, `PageHeader.tsx`
- Create: `web/src/components/calm/calm.css`, `web/src/components/calm/calm.test.tsx`
- Modify: `web/src/styles.css` (`.btn` variants live here or move to calm.css)
- Modify: `web/src/main.tsx` (import `ui.css`)

**Interfaces:**
- `Button` props: `variant: 'primary' | 'ghost' | 'danger-hotline'`, `type?`, `disabled?`, `onClick?`, `children`. Renders `<button>`. Min height 44 px.
- `Card` props: `as?: 'section' | 'article' | 'div'`, `children`. White, 20 px radius, mist border.
- `Badge` props: `tone: 'status' | 'critical' | 'high' | 'medium' | 'low' | 'neutral'`, `children`. Always renders text.
- `Field` props: `label`, `id`, `error?`, `children` (the input). Label always visible.
- `DataTable<T>` props: `columns: {key, header, render}[]`, `rows: T[]`, `rowKey`, `empty: ReactNode`. Stacks into labelled rows below 640 px.
- `EmptyState` props: `title`, `body`, `action?: ReactNode`.
- `Banner` props: `tone: 'info' | 'notice' | 'error'`, `title?`, `children`, `role?`.
- `PageHeader` props: `title`, `actions?`.

- [ ] **Step 1: Write failing tests** for: Button renders primary class and min height via class; Badge renders its text for every tone; DataTable shows `empty` when rows is empty; DataTable renders header labels inside each cell for the stacked layout; Field associates label with input via `htmlFor`; Banner with `tone="error"` sets `role="alert"` when `role` passed.
- [ ] **Step 2: Run** `cd web && npx vitest run src/components/ui` and confirm failures (modules missing).
- [ ] **Step 3: Implement** the eight components and `ui.css` using tokens only (no hex literals outside `tokens.css`).
- [ ] **Step 4: Run** the ui tests, then the full suite `npx vitest run`. Expect 142 existing plus new tests, all passing.
- [ ] **Step 5: Typecheck and build** `npm run typecheck && npm run build`.
- [ ] **Step 6: Commit** `git add web/src/components/ui web/src/main.tsx && git commit -m "feat(web): design primitives for redesign"`.

## Phase 2: Shell and navigation

**Files:**
- Modify: `web/src/layout/AppShell.tsx`
- Create: `web/src/layout/MobileMenu.tsx`, `web/src/layout/shell.css`
- Modify: `web/src/styles.css` (remove the old `.shell*` and `.navlink` rules)
- Test: `web/src/layout/AppShell.test.tsx`

**Interfaces:**
- `AppShell` props unchanged: `{ title: string; children?: ReactNode }`.
- `MobileMenu` props: `items: {to, label}[]`, uses `useState` for open. Button has `aria-expanded` and `aria-controls`.

- [ ] **Step 1: Failing tests:** role nav shows the right items (dispatcher gets 6, dmo 2, responder 1); the current route link has `aria-current="page"`; the mobile menu button toggles `aria-expanded`; signed-in role text appears in the top bar.
- [ ] **Step 2: Run** and confirm failures.
- [ ] **Step 3: Implement** the harbour sidebar, white top bar with title area, and the menu button under 640 px (sidebar hidden until opened).
- [ ] **Step 4: Run** full suite; fix any test that relied on the old markup and note it in the commit.
- [ ] **Step 5: Commit** `feat(web): redesigned staff shell with mobile menu`.

## Phase 3: Public pages

**Files:**
- Modify: `web/src/pages/Landing.tsx`, `web/src/features/auth/LoginPage.tsx`, `web/src/pages/Forbidden.tsx`
- Modify: `web/src/components/PublicHeader.tsx`
- Create: `web/src/pages/public.css`
- Test: `web/src/pages/Landing.test.tsx` (new), existing `LoginPage.test.tsx`, `routes/Home.test.tsx`

**Interfaces:** `Landing` and `LoginPage` keep their current props (none). `Forbidden` keeps its current props.

- [ ] **Step 1: Failing tests:** landing shows the safety text exactly; hotline is an `<a href="tel:000-0000">`; both front-door links go to `/login` and `#resident-app`; Forbidden shows "Use the mobile app" for residents.
- [ ] **Step 2: Run** and confirm the new landing test fails where expected.
- [ ] **Step 3: Implement** using `Button`, `Card`, `Banner`. Keep the layout already approved in `cbd888f`. Move public CSS out of `styles.css` into `public.css`.
- [ ] **Step 4: Run** full suite, typecheck, build.
- [ ] **Step 5: Commit** `feat(web): public pages on new primitives`.

## Phase 4: Dispatcher queue and dashboard

**Files:**
- Modify: `web/src/features/reports/ReportQueue.tsx`, `web/src/features/dashboard/SummaryCards.tsx`, `web/src/features/reports/StatusBadge.tsx`, `web/src/features/reports/PriorityBadge.tsx`, `web/src/features/reports/VerifiedBadge.tsx`
- Test: existing `ReportQueue.test.tsx`, `StatusBadge.test.tsx`, `SummaryCards.test.tsx`; add cases to `ReportQueue.test.tsx`

**Interfaces:** `ReportQueue` props unchanged. Badges keep their current props, and gain a `tone` mapping: status uses teal outline, priority uses critical/high/medium/low tones.

- [ ] **Step 1: Failing tests:** queue renders as a `DataTable` with headers Type, Priority, Status, Reported, Team; empty queue shows `EmptyState` with a next-step sentence; a 600-character description does not break the row (test checks the element has `overflow-wrap: anywhere` class).
- [ ] **Step 2–4:** implement, run, fix tests whose text moved.
- [ ] **Step 5: Commit** `feat(web): dispatcher queue as data table`.

## Phase 5: Incident details and assign-team dialog

**Files:**
- Modify: `web/src/features/reports/IncidentDetails.tsx`, `web/src/features/reports/AssignTeamDialog.tsx`
- Test: existing `IncidentDetails.test.tsx`, `AssignTeamDialog` tests (via `IncidentDetails.test.tsx`)

**Interfaces:** props unchanged. Dialog uses `Card` inside the existing `.overlay`.

- [ ] **Step 1: Failing tests:** dialog has `role="dialog"` and `aria-modal="true"` and an accessible name; Escape closes it; focus returns to the trigger after close.
- [ ] **Step 2–4:** implement, run, fix.
- [ ] **Step 5: Commit** `feat(web): incident details and assign dialog redesign`.

## Phase 6: Map, analytics, monitor, audit

**Files:**
- Modify: `web/src/features/map/IncidentMap.tsx`, `web/src/features/analytics/AnalyticsPage.tsx`, `ChartCard.tsx`, `ExportButtons.tsx`, `web/src/features/dmo/MonitorPage.tsx`, `web/src/features/audit/AuditPage.tsx`
- Test: existing tests for each; add empty-state cases

**Interfaces:** props unchanged. Chart colours use `--color-primary` and `--color-muted` only.

- [ ] **Step 1: Failing tests:** map with zero located reports shows `EmptyState`; audit with no entries shows `EmptyState`; analytics export buttons have visible text labels.
- [ ] **Step 2–4:** implement, run, fix.
- [ ] **Step 5: Commit** `feat(web): map, analytics, monitor, audit redesign`.

## Phase 7: Teams, users, responder screens

**Files:**
- Modify: `web/src/features/teams/TeamsPage.tsx`, `web/src/features/users/UsersPage.tsx`, `web/src/features/responder/AssignmentsPage.tsx`, `web/src/features/responder/OperationForm.tsx`
- Test: existing tests for `OperationForm` and any page tests; add `EmptyState` cases for teams, users, assignments

**Interfaces:** props unchanged. `OperationForm` uses `Field` for each input and keeps every current field name and validation message.

- [ ] **Step 1: Failing tests:** each list shows `EmptyState` when empty; every form field has a visible label; validation messages are still shown.
- [ ] **Step 2–4:** implement, run, fix.
- [ ] **Step 5: Commit** `feat(web): teams, users, responder screens redesign`.

## Phase 8: Cleanup and verification

**Files:**
- Modify: `web/src/styles.css` (delete any rule no longer referenced; keep globals and Tailwind imports)
- Modify: `docs/design-tokens/tokens.json` (confirm it matches `tokens.css`)
- Modify: `HANDOFF.md` (status, what changed, resume prompt)

- [ ] **Step 1:** search for unused classes: `grep -o 'className="[^"]*"' web/src --include=*.tsx -h | tr ' ' '\n' | sort -u` and compare with `styles.css`. Delete rules that match nothing.
- [ ] **Step 2:** run `cd web && npx vitest run && npm run typecheck && npm run build`. All green.
- [ ] **Step 3: Browser check.** Start `npx vite preview --port 4176`. Load each route at 375, 768, 1440 px in Chromium, Firefox, WebKit. Check no horizontal scroll and no console errors. Use the Playwright builds already installed (see earlier session notes: `firefox-1538`, `webkit-2336` paths).
- [ ] **Step 4: Staff screens.** Sign in with the seeded dispatcher, responder, and dmo accounts on `flutter-5094e` (passwords are not stored in the repo; Airen must provide them or run the sign-in). Screenshot each route. If Airen does not provide credentials, report staff screens as not checked.
- [ ] **Step 5: Commit** `chore(web): remove unused styles; handoff for redesign`.

---

## Not checked by this plan

- A real phone and iOS Safari.
- Live map tiles (headless may not render them).
- Staff screens if no test credentials are provided.
