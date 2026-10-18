# Findings (release audit, 18 October 2026)

Target: branch `fix/release-audit-f01-f10` at `be3e71d`, emulator project `demo-release-audit`. Each finding was reproduced on this stack. Severity scale: Blocker, Critical, High, Medium, Low.

## Findings 1 to 7 (new in this pass)

### 1. Public demo banner in the public header (High)
- **Steps:** open `/`, `/login` or `/register` as anonymous at any width.
- **Expected:** no demo or development banner on public pages (brief: no public demo banners).
- **Actual:** the header shows "Demo site · hotline not configured".
- **Source:** `web/src/components/PublicHeader.tsx:8`.
- **Evidence:** `evidence/screenshots/login-wrong-password-1440.png`.
- **Note:** the header text comes from the hotline setting. The fix should show nothing or a neutral notice, not a demo label, and should not invent a number.

### 2. No 404 page on the committed branch (High)
- **Steps:** open an unknown address such as `/no-such-page-audit`, anonymous or signed in.
- **Expected:** a "Page not found" recovery page.
- **Actual:** redirects to `/`. A signed-in resident lands on `/my`.
- **Source:** `web/src/App.tsx:44` (`<Route path="*" element={<Navigate to="/" replace />} />`).
- **Note:** the shared working tree has `pages/NotFound.tsx` wired at `App.tsx:52`. That change is not on the branch, so the release has to include it.

### 3. Emergency card with no number on the resident hub (Medium)
- **Steps:** sign in as a resident and open `/my`.
- **Expected:** a call prompt only when a real number is configured. Otherwise a neutral safety message.
- **Actual:** the card reads "If you are in danger, call now" with no number, next to a header that says the hotline is not configured.
- **Evidence:** `evidence/screenshots/surfaces/resident-_my-1440.png`.

### 4. Fix branch is not a release candidate (Blocker for release)
- **Facts:** the committed branch is `effd53f` plus the fix commits. The shared working tree has about 246 uncommitted changes, including the 404 page and copy changes.
- **Effect:** a release from this branch would ship defects that the working tree already fixes, and would lose work that is not committed.
- **Needed:** decide how the working-tree changes are committed and combined with the fixes, then re-audit that combined state. Committing those changes is outside this audit; it needs Airen's decision.

### 5. Small touch targets at 390 px (Medium)
- **Measured:** under 44 px in both dimensions: inline text links ("Back to the queue", "Back to my reports", "Create a resident account", "Sign in" link). Map and monitor priority markers appear as `div` elements with text "Medium" or "High", and need a markup check to see whether they are interactive.
- **Note:** the "Skip to content" link is visible on focus only, so it is not counted as a defect.
- **Evidence:** `evidence/results/surfaces.json` (field `smallSample`).

### 6. WebKit Firestore Listen errors on navigation (Low, unresolved)
- **Steps:** sign in as a dispatcher in WebKit, load the dashboard, wait 10 seconds, then navigate to `/map`.
- **Observed:** no errors during the 10-second idle. On navigation, one `requestfailed` with "cancelled" on the Listen channel, and two `pageerror` entries with the channel URL as the message. Data loads on both pages.
- **Not reproduced:** the earlier access-control errors. This emulator doesn't produce them.
- **Status:** not a product defect proven, and not a clean WebKit result. Needs a hosted non-production Firebase target to decide.
- **Evidence:** `evidence/webkit-listen.cjs`; `evidence/results/cross-browser.json`.

### 7. Rate limit reached during normal use (Observation)
- **Observed:** the API's 300-per-15-minutes limit returned 429 to a resident submitting a report during the sweep.
- **Effect:** a resident in the middle of a report would see a failure. The product should say what to do.
- **Note:** the limit is intentional. This is about the message, not the limit.

## Finding 8 (from the earlier functional audit, still open)

### 8. Admin Accounts panel has no team control after creation (Medium)
- **Steps:** Admin, Accounts and roles section, for an existing responder.
- **Expected:** the same team assignment as the Users screen (F03).
- **Actual:** only the creation form has a team field. The Users screen has the control.
- **Source:** `web/src/features/admin/AccountsPanel.tsx`.

## The ten functional-audit findings: fresh outcome

| ID | Outcome | Evidence |
| --- | --- | --- |
| F01 | Fixed. Demotion refused on the next request (was 200). Deactivated token refused (Auth returns 401 because the emulator disables the account; the unit test's 403 expectation was wrong). | `api-checks.json` |
| F02 | Fixed in the product. Reset flow verified end to end on the emulator. Real email delivery unverified. | `flows-auth.json` |
| F03 | Fixed on the Users screen. Admin Accounts panel still open (Finding 8). | `flows-core.json`, `api-checks.json` |
| F04 | Fixed for CSV. PDF totals not parsed. | `api-checks.json`, `flows-ops.json` |
| F05 | Fixed at the API. Browser reload and lost-response cases not exercised. | `api-checks.json` |
| F06 | Fixed for in-app links. Browser Back not guarded. | `flows-core.json` |
| F07 | Fixed on the resident detail page. Other pages not tested offline. | `flows-core.json` |
| F08 | Fixed. Email stored and found in the accounts list. | `flows-auth.json` |
| F09 | Fixed at the API. Audit page display not checked. | `api-checks.json` |
| F10 | Fixed. API 400 and form message. | `api-checks.json`, `flows-ops.json` |

## Update: Finding 6 (WebKit Listen errors), investigated

Evidence: `evidence/listen-investigate.cjs`, `evidence/results/listen-investigate.json`.

| Step | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Sign-in, dashboard, idle | 0 errors | 0 | 0 |
| In-app navigation (map and back) | 0 | 0 | 0 |
| Full reload | 0 errors, 0 cancelled | 0 errors, 1 cancelled | 2 errors, 1 cancelled |
| Full navigation to map | 0 errors, 0 cancelled | 0 errors, 2 cancelled | 2 errors, 1 cancelled |

**Conclusion:** the Listen channel is cancelled when a page unloads, in all three engines. WebKit reports the cancelled connection as an uncaught page error. The data still loads in every engine, and no error appears during normal use or in-app navigation. Not a product defect on this evidence. It is not a clean WebKit result either: the earlier access-control errors did not reproduce here, and a hosted non-production target should confirm the behavior before release (REPAIR-PLAN item 7).
