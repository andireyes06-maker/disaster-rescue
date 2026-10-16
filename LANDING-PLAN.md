# LANDING-PLAN: build steps for the landing page

Based on `LANDING-SPEC.md`. Build only after the spec is approved. One commit per step. Each step ends with its tests passing.

## Step 1: Routing test first (red)
- Add tests for `Home` (in `web/src/App.test.tsx` or a new `Home.test.tsx`):
  - Signed-out visitor sees the landing page, not a redirect.
  - Loading state still shows "Loading...".
  - Dispatcher, responder, dmo redirect to their landing routes.
  - Resident still redirects to `/forbidden`.
- Expected: signed-out test fails now.
- Commit: `test(web): cover landing-page routing rules`.

## Step 2: Landing page component
- New file `web/src/features/landing/LandingPage.tsx`.
- Sections in the spec's order: hero, who it is for, report flow, safety and privacy, credits, footer.
- Placeholders are labelled in the text itself ("placeholder").
- Commit: `feat(web): add public landing page component`.

## Step 3: Wire it into `Home`
- `Home` renders `LandingPage` for signed-out visitors. Other branches are unchanged.
- Step 1 tests now pass.
- Commit: `feat(web): show landing page at / for signed-out visitors`.

## Step 4: Styles
- Add landing styles to `web/src/styles.css`, using existing tokens.
- Mobile first, then desktop breakpoint.
- Commit: `style(web): landing page layout and responsive styles`.

## Step 5: Verify
- `npm run typecheck`, `npx vitest run`, `npm run build` in `web/`.
- Browser at 375 px and 1440 px: check no horizontal scroll, hotline reachable, both buttons go to the right place, screenshots reviewed.
- Signed-in staff and resident redirects still work in the browser.
- Report results with exact commands and output. No "done" without these checks.

## Not in this plan
- Real team names, roles, hotline number, APK link, privacy link: placeholders until you provide them.
- Mobile app changes: none.
