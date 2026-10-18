# Staff readability and state audit — October 17, 2026

Working tree only. Nothing committed, pushed, or deployed. Runtime checked as demo-disaster-rescue with Auth emulator enabled before sign-in. All interaction checks were read-only; no reports, roles, teams or accounts were changed. Production and the separate Flutter process were untouched.

## Fixed

- **S05:** signed-in product labels, badges, metadata and phone overrides now use a 13px minimum at the default root size (0.8125rem). Inbox descriptions use 14px. Chart axes, sidebar footnote and Leaflet attribution were included after the first measurement exposed them. Root-relative sizes allow text enlargement.
- **S07:** map and monitor markers are interactive. Hit boxes are now 44 × 44px, centered on the incident location. Focus rings remain visible. A real browser check revealed Enter did not navigate despite the marker’s button role: explicit Enter/Space handling now opens the incident and stops map scrolling for that activation.
- Dense maps no longer display overlapping priority labels everywhere. Priority shapes/colors and the legend remain; a marker’s priority label appears on hover or keyboard focus. The complete report/type/priority/status title remains available for naming the control.
- **S08, partial:** admin section links and management action buttons have a 44px minimum height. Leaflet attribution links are underlined (the initial tablet pass reported link-in-text-block). Attribution still uses compact inline targets; this does not claim all third-party targets are 44px.
- **S09:** phone account controls use a stable avatar/name/sign-out grid; demo notice wraps onto its own row. Search now has a short placeholder plus a persistent associated hint, instead of a clipped explanation inside the input.
- The inbox distinguishes a genuinely empty queue from a view with no matches. A Clear search and filters action resets the view, restores all rows, and returns focus to Search incidents.
- Map loading uses the shared map skeleton. Filtered-out locations are distinguished from reports with no locations, with a working Clear map filters action.

## Verified

- **334 tests / 49 files**, typecheck clean, production build succeeds. Six new behavior tests cover search recovery, map loading/error/retry/filter reset, and Enter/Space activation. Existing suite preserved. Logs saved here.
- **39 Chromium route/width combinations:** 10 staff routes using admin access and 3 resident routes, each at 390, 768 and 1440px. No horizontal overflow, axe violations, uncaught page errors or visible own text under 13px in the measured layouts. This is an automated rendered check, not a manual review of every screenshot. Final results: final.json. Earlier before.json and after.json retained; after.json exposed the attribution link issue and remaining chart/footnote sizes, fixed before final.json.
- Dashboard under-13px samples: **110 → 0** at 390px and **113 → 0** at 1440px. Measured with the same script and sample data in before.json/final.json.
- **12 Firefox/WebKit cases:** dashboard, map and analytics at 390/1440px, zero axe findings or page overflow. Space opens a real demo incident in both engines/widths. Raw cross-browser.json sampled search before React updated, so its searchRecovered=false values are not used as final recovery evidence. The targeted rerun search-recovery.json explicitly waits for the controlled input and rows: all four cases restore search, retain focus, and pass axe/overflow.
- **S10:** real session restoration in Chromium with the emulator token response held: one main landmark, the Checking your account… status, three skeleton rows, then Dashboard after release. states.json and session-restore-390.png. This completes that specific browser gap; it does not test every authentication failure.
- **Real demo:** Enter on a map marker opens /incidents/demo-report-01; search with no matches resets to 24 rows, empty query, focus on search.
- **Isolated frontend state harness:** dashboard/map loading, error, retry and empty states exercised by replacing only the local reports hook module response. Retry called once per surface and reached the correct empty heading. These are rendering/interaction checks, not simulated Firestore transport recovery. Harness and scope are explicit in state-check.cjs.
- Viewed screenshots: phone dashboard, phone map before/after label refinement, phone analytics, session-restoration skeleton, and the captured phone empty inbox. Other captured screenshots are automated evidence unless separately stated.

## Remaining audit work

- Other staff forms: inline field validation, associations, submit recovery and focus during real pending actions; the prior S06 record remains partly verified.
- Broader staff and resident failure branches, real transport reconnection and stale-data messaging; the hook harness does not prove those paths.
- Text-only enlargement, forced colors and reduced-motion behavior for this continuation were not newly tested. Browser checks used reduced-motion preference to get stable layout measurements; this is not a motion audit.
- True dispatcher/DMO/responder role views were not re-signed-in in this pass; staff screens used admin’s permitted access. Earlier role-guard checks are separate evidence.
- Screen-reader speech, physical devices, Flutter and live services remain unverified here. No new Lighthouse score is claimed. Owner hotline/privacy inputs remain outstanding.

## Reproduce

Use the running local React demo at localhost:5174; never substitute 127.0.0.1:5174. Scripts use cached Playwright browsers and axe outside the app dependencies. surface-check.cjs final measures routes; state-check.cjs verifies delayed restoration and isolated states; cross-browser-check.cjs checks Firefox/WebKit, with optional search argument for the targeted recovery rerun. The scripts contain local absolute paths. Do not run them against production.
