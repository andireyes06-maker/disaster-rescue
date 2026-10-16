# LANDING-SPEC: public landing page at the web app root

Status: built and checked (Oct 16, 2026). Awaiting Airen's review. Source notes: `LANDING-NOTES.md`.

## Goal
A signed-out visitor at `/` sees a clear public page that explains the system and sends them to the right front door: the staff web sign-in or the resident mobile app. Signed-in users keep their current redirect to their role page.

## Scope
In scope:
- One public page at `/` for signed-out visitors.
- Hero, audience blocks, report-flow strip, safety and privacy section, hotline placeholder, credits placeholder, footer.
- Responsive layout at phone width (375 px) and desktop (1440 px).

Out of scope (for now):
- Additional pages (about, privacy, contact). Decision: one page.
- Any API or database change. The page is static.
- Publishing a real APK or TestFlight build. The download link is a placeholder.
- Real team names, roles, and the real LDRRMO hotline number. All are placeholders.

## Behavior
| Visitor state | `/` shows |
|---|---|
| Signed out (`user` is null, loading finished) | Landing page |
| Loading (auth not resolved yet) | The existing "Loading..." status, so no flash of the landing page to a signed-in user |
| Signed in as dispatcher, responder, or dmo | Redirect to role landing route (unchanged) |
| Signed in as resident | Redirect to `/forbidden` (unchanged), which points to the mobile app |

Buttons:
- "Sign in to the staff web" goes to `/login`.
- "Get the resident app" goes to the mobile download placeholder (see below). It is not a live link until a real build exists.
- The hotline button is a `tel:` link to the placeholder number, with the visible label "Emergency hotline (placeholder)".

## Content (copy is final unless you change it)
- **Hero:** "Disaster Rescue Reporting and Monitoring System". Sub line: "Report an emergency, track the response, and see how the community is affected." Buttons as above.
- **Who it is for:** four short blocks, one line each:
  - Residents: report an emergency with photos and location, and follow its status.
  - Dispatchers: verify, prioritize, and assign reports.
  - Responders: acknowledge assignments and post rescue updates.
  - DMO: monitor trends and export summaries.
- **How a report moves:** Submitted, Verified, Assigned, In progress, Resolved, Closed. Horizontal on desktop, vertical on phone.
- **Safety:** exact text, no edits: "Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline."
- **Privacy:** one short paragraph and a link placeholder "Privacy notice (pending review)". No link target until legal review is done.
- **Credits:** placeholder text "Team names and roles: to be added" plus the course line "IT 305 Advance Web Development, BSIT 3J, Bulacan State University".
- **Footer:** sign-in link and the course line. No repository link (private repo).

## Design
- Follows the existing Calm Clarity tokens in `web/src/theme/tokens.css` and `web/src/styles.css`.
- Coral (`--color-critical`, `#C83919`) appears only on the hotline button, because it is about emergency contact. No decorative use.
- No gradients, no stock photos, no icon grid, no testimonials, no user counts.
- Buttons are at least 44 px tall. Body text is at least 16 px.
- No horizontal scroll at 375 px.

## Acceptance checks
1. Signed-out visitor at `/` sees the landing page, with no redirect to `/login`.
2. Each button goes where the table says. The hotline link is `tel:` with the placeholder number.
3. The safety text matches the wording above exactly.
4. Signed-in staff are redirected as before. Signed-in resident still goes to `/forbidden`.
5. No horizontal scroll at 375 px. Hotline button is reachable in one tap.
6. `npm run typecheck`, `npx vitest run`, and `npm run build` pass in `web/`.
7. Browser check at 375 px and 1440 px, with screenshots reviewed before sign-off.

## Review against the code (done)
- `web/src/App.tsx` currently routes `/` to `Home`, which shows "Loading..." while auth loads and then `Navigate`s to `landingFor(role)` or `/login`. The change replaces only the signed-out branch of `Home`. Existing routes stay as they are.
- `/login` and `/forbidden` exist and stay unchanged.
- No API calls are needed, so no test mocks change except a new unit test for `Home`.
- Existing theme tokens cover the colors and spacing. No new dependency is needed.
- Risk: `Home` is used by the router for `/`. A regression would show a blank page for everyone, so the redirect tests must stay in place.
