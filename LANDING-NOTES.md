**Historical notes:** current public copy is governed by `design-plans/product-copy-2026-10-18/HANDOFF.md`. Do not restore old placeholders, environmental labels or academic credits.

# Landing page: working notes (not approved, no code yet)

Status: draft for review. Nothing here is built. Each open question needs an answer before the plan step.

## Decisions already made
- **Location:** the web app root `/` (public, outside the sign-in gate). Served on the existing Vercel site.
- **Size:** big task. Spec, then plan, then build, per CLAUDE.md.
- **Audience:** three people land here: a resident who needs the mobile app, a staff member who needs the web sign-in, and a grader or visitor who wants to understand the project.

## What the page must say (from X-SPEC.md)
- Product: Disaster Rescue Reporting and Monitoring System. Residents report disasters, dispatchers verify and prioritize, rescue teams respond and record outcomes, and DMO monitors trends and exports reports.
- Two front doors:
  - **Residents:** Flutter mobile app. Report an emergency with photos and location, track reports, see notifications.
  - **Staff:** web app. Dispatcher queue, teams, assignments, DMO monitoring and analytics.
- Safety line, required on every entry screen: "Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline."
- Emergency hotline shown as a clear call button. The number is still a placeholder (`000-0000`) until the LDRRMO number is confirmed.
- Footer: Rescue Reports · Community incident reporting and response coordination.

## Sections (proposed)
1. **Hero:** product name, one sentence on what it does, two buttons: "Sign in to staff web" and "Get the resident app".
2. **Who it is for:** three short blocks (resident, dispatcher, responder, DMO) with one line each, not a feature grid of icons.
3. **How a report moves:** Submitted, Verified, Assigned, In progress, Resolved, Closed. A simple horizontal flow, mobile stacks it vertically.
4. **Safety and privacy:** the required safety line, a short privacy note, and a link to the privacy document (`docs/privacy-and-coordination.md`) once it is cleared for public use.
5. **Product identity:** Rescue Reports and incident-response purpose.
6. **Footer:** project repository link (private, so maybe omitted), sign-in link, contact.

## Design constraints
- Calm Clarity UI (from the handoff): coral reserved for critical priority, never used as a decorative brand color.
- Must work at phone width with no horizontal scroll, since most residents arrive from a phone.
- No stock photos, no fake testimonials, no fake user counts. Honest copy only.
- Avoid the AI-template look: no three-icon feature grid, no gradient buttons, no "Unlock the power of" copy.
- Plain-language copy: short sentences, no jargon, no em dashes in user-facing text (CLAUDE.md).

## Technical notes
- The web app already routes `/` to `Home`, which redirects to `/login`. The landing page replaces that redirect for signed-out visitors. Signed-in staff still go to their landing route.
- Public page means no auth, no API calls. It needs no backend change.
- Mobile download: the app has no published build yet. Describe browser reporting; do not invent a store release.

## Answers received
- **Hotline (Q2), confirmed by Airen:** keep the placeholder on the public page until the real LDRRMO number is confirmed. The page shows a clearly marked placeholder, not a fake number.
- **Team credits (Q1):** placeholders until names and roles are provided.
- **"Placeholder all" (Airen):** every open content item uses a clearly marked placeholder: team names and roles (Q1), mobile download link (Q3), and the privacy-document link (Q7) until legal review is done.
- **Defaults used for design choices (Airen did not answer these, so the recommended option stands unless changed):**
  - Q4 tone: professional public-service product.
  - Q5 pages: one page.
  - Q6 sign-in button: goes straight to `/login`.

## Open questions (need answers before the plan)
1. **Team members:** names and roles for the credits section. Your contribution log is `docs/contributions.md` (still to be filled in).
2. **Hotline number:** the real LDRRMO number, or keep the placeholder on the public page until confirmed?
3. **Mobile download:** is there an APK or TestFlight link to point to, or should the page only say the app is for demo?
4. **Tone:** formal school-project look, or a more public-facing look for a real deployment?
5. **Pages:** one page only (recommended), or a few sub-pages (about, privacy, contact)?
6. **Sign-in button:** should it go straight to `/login`, or show a short "who should sign in here" note first?
7. **Privacy document:** may we link `docs/privacy-and-coordination.md` publicly, or does it need legal review first (it says so)?

## Acceptance checks (draft)
- Signed-out visitor at `/` sees the landing page with no redirect.
- Both sign-in buttons work and go to `/login`.
- No horizontal scroll at 375 px. Hotline button reachable with one tap.
- Safety line present and unchanged.
- Passes `npm run typecheck`, `npx vitest run`, and `npm run build` in `web/`.
- Browser check at 375 px and 1440 px, with screenshots reviewed before sign-off.
