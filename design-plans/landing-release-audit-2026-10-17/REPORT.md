# Landing audit and release readiness

October 17, 2026 · Codex · Phase 1 · working tree only

## Outcome

The landing-page hardening pass is implemented and verified locally. The current indigo/violet identity, Geist typography, 16-second interactive film, sample-data disclosures, factual course credits, and existing authentication/role behavior are preserved. Nothing was committed, pushed, or deployed.

**Hosting update after Claude’s continuation:** `LEDGER.md` records read-only confirmation that Vercel Production has all five client environment-variable names, and deployed commit `effd53f` points at the Render API without localhost. Encrypted values were not read. This supersedes treating the local missing-variable result as evidence of a hosting configuration problem. The current working tree is not that deployed build, and the release gate has not run against hosting inputs. This header pass did not independently repeat the hosting inspection.

**Release status: not signed off.** The local release configuration has no `VITE_API_BASE_URL`. The release command now rejects that configuration. Hosted settings were not inspected during the original landing pass; the later Claude verification is recorded above and in LEDGER.md. The actual deployed API address and all Firebase client values must be verified in the hosting environment before release. Privacy text is still pending review and the hotline is still unconfigured; no details were invented. A classroom demonstration and an operational emergency service have different readiness requirements.

This phase audits the landing and its immediate navigation/recovery. Signed-in pages received regression checks after route/auth loading changes; they have not received their new full design audits. Flutter and backend release review are separate open phases.

## Verified findings and fixes

Severity: P0 blocks the task, P1 is a major release/accessibility issue, P2 affects usability or quality, P3 is polish. **16 findings: 4 P1, 11 P2, 1 P3. Fifteen are resolved; the release-configuration finding has a guard implemented and a remaining environment verification.**

| ID | Priority | Finding and impact | Final implementation | Evidence/status |
|---|---|---|---|---|
| L01 | P1 | Returning from sign-in left the landing with the sign-in document title; the browser identified the wrong page. WCAG 2.4.2. | Landing restores its own title; HTML starts with the same product identity. | Unit test and actual SPA return; fixed. |
| L02 | P1 | Video pause/play inherited a violet focus ring against indigo: 2.29:1, below the 3:1 non-text contrast target. | Light-violet focus ring, 10.89:1 against indigo. | Computed palette contrast; full keyboard pass; fixed. |
| L03 | P2 | Substantial phone prose and safety text were only 10–12px. This was a readability/design issue, not an asserted minimum-font WCAG failure. | Reading text is generally 14–16px, safety 13px; type scales in rem. Small numbers and text inside illustrative product media remain smaller. | Six widths and 200% root text scaling; fixed. |
| L04 | P2 | The safety warning followed the entire film, late in the phone reading order. | The exact warning now appears inside the opening copy, before the film. | Unit DOM-order test, rendered captures; fixed. |
| L05 | P2 | Public entry downloaded Firestore and Leaflet. Eager route imports and manual chunk groups pulled shared React into the maps chunk. | Authenticated/access routes load on demand; Firebase auth is independent of Firestore; automatic chunk ownership prevents the maps dependency leak. | Production request record: no map/Firestore entry downloads. Five role sessions and 13 signed-in route visits passed; fixed. |
| L06 | P2 | Default Firebase initialization loaded popup/redirect support and an external iframe although this product uses email/password. | `initializeAuth` keeps IndexedDB/local/session persistence fallbacks without unused popup machinery. | Five emulator roles sign in and restore after reload; fixed. |
| L07 | P2 | Restoring a session showed only a bare loading paragraph. | A branded, labeled opening skeleton reserves the two-part composition; decorative blocks are hidden from assistive technology. | Home-state test plus isolated 390/1440 component renders, no axe violations; fixed. |
| L08 | P2 | Media failure silently replaced the player and discarded focus if a chapter/control was focused. | A status explains the failure, the schematic remains, and focus moves to its region only when needed. | Actual missing-poster render and focused-failure browser check, unit test; fixed. |
| L09 | P2 | Pending autoplay had no loading feedback and could not be paused before playback began. | Loading status plus a working Pause control during buffering; browser refusal still allows explicit Play. | Delayed MP4 browser request, pause-before-decode, unit test; fixed. |
| L10 | P2 | Fixed sticky-header offsets could not follow enlarged/wrapped header content; short screens lost reading space. | Header ResizeObserver maintains anchor clearance; navigation can wrap; short screens use a static header; skip target is at least 44px. | Six widths, doubled root text, landscape across engines; fixed. |
| L11 | P2 | Live preference changes could leave the poster showing a stale chapter/progress state. | Preference changes reset chapter/progress/pending seek and stop playback; explicit opt-in remains. | Browser: poster, Report selected, automatic scrolling, zero running animations after settling; fixed. |
| L12 | P2 | `/robots.txt` returned SPA HTML; Lighthouse reported 23 parse errors. | A real robots text file is emitted and served. | Production HTTP 200 and exact text; final SEO scan; fixed. |
| L13 | P2 | Access/privacy lacked its own section heading; feature text was not a semantic list; shell metadata lacked matching brand/fallback information. | Named access section, feature list, matching theme/title/share text and JavaScript-disabled guidance. | DOM audit and metadata/source check; fixed. |
| L14 | P1 | A build could succeed with no API address and display a configuration-error screen. | `preflight:release` validates deployed HTTPS API and complete non-demo Firebase inputs; Vercel uses `build:release`. Ordinary builds remain available for isolated local inspection. | Nine validator tests; actual local release preflight fails on missing API. Hosted inputs still require verification. |
| L15 | P3 | High-contrast state styling relied on browser forced-color remapping and produced inconsistent computed-color audit findings. Painted text was already readable. | Explicit system colors and selected-chapter outline make intent and computed results consistent. | Three emulated engines, zero final violations; fixed. |
| L16 | P1 | A failed registration route download could remove the app instead of showing recovery. | Route boundary explains the error, focuses the explanation, and offers Reload/Return to start; navigation clears the failed state. | Production chunk download aborted deliberately: focused recovery, zero axe violations, working return; two unit tests; fixed. |

The headline/description entrance retains spatial motion at full opacity so reading does not wait for the fade. Video and section choreography remain dynamic, and selected chapters now have weight as well as color.

## Technical audit health

This is the Impeccable internal rubric, not a WCAG certification or a production approval.

| Dimension | Score / 4 | Evidence and practical limit |
|---|---:|---|
| Accessibility | 3 | No automated violations in checked states; keyboard/focus/contrast checked. Screen reader testing remains open. |
| Performance | 3 | Route payload reduced, unused auth iframe removed, actual landing measured. Physical mobile cost and deployed network are unmeasured. |
| Theming | 3 | Existing light/indigo system preserved; system colors handle high contrast. Illustration-specific colors remain intentionally local. |
| Responsive design | 4 | 320–1920px, intermediate widths, text scaling, landscape, and synthesized touch checked without overflow. |
| Implementation integrity | 3 | Real workflow/recovery checks and truthful labels; detector executable was unavailable. |
| **Total** | **16 / 20** | **Good; remaining release verification is explicit.** |

## Browser and accessibility evidence

- Chromium: 320, 390, 768, 1024, 1440, 1920px. `final-audit.json`: no axe violations, no short visible interaction targets, no horizontal overflow.
- Chromium, Firefox, WebKit: normal phone, 200% root text, 844×390 landscape, unavailable poster, and forced colors. `edge-checks.json`: 15 scenarios, no final axe violations, no page exceptions, no horizontal overflow. Text-overflow diagnostics include the intentional 1px visually-hidden section heading; it is not visible content clipping.
- All three engines at 320/390/1440: actual autoplay, seek/resume, chapter progress, keyboard chapter selection, pause, offscreen pause/return resume, and reduced-motion poster/manual chapter selection. `film-final-checks.json`.
- Chromium: 18-step keyboard order through the footer, visible outlines, skip link, delayed video cancellation, live reduced motion, focused media failure recovery, synthesized touch to registration. `behavior-checks.json`.
- Body ink/white 16.26:1; muted/white 6.24:1; safety/white 6.45:1; film focus/indigo 10.89:1.
- Screenshots were inspected for desktop composition, phone readability, high contrast, generated video frame, and loading composition. Loading is explicitly an isolated component fixture, not a claim of delayed live authentication.

Automated accessibility checks used axe WCAG A/AA, WCAG 2.1 AA, WCAG 2.2 AA and best-practice rules. A clean scan does not replace screen-reader or physical-device checks.

## Production-build measurement

The actual landing was asserted before measurement: correct hero/title/footer, no configuration-error message. Local audit configuration uses a demo Firebase project and local API address. **Do not deploy that audit build.** No production account or API was used.

| Lighthouse category | Final local mobile simulation |
|---|---:|
| Performance | 94 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

| Metric | Measured |
|---|---|
| First contentful paint | 2.0 s |
| Largest contentful paint | 2.8 s |
| Total blocking time | 50 ms |
| Cumulative layout shift | 0 |
| Speed index | 2.0 s |

This is one clean local Lighthouse run after the functional browser checks finished; it is not a live-site or device measurement. LCP at 2.8s is still above the usual 2.5s target and should be watched on hosting/phones. No scores are used as a guarantee of operational readiness.

Two early runs measured the configuration-error screen because the ordinary production build had no API address. They were rejected and retained under `evidence/rejected-configuration-screen-runs/`; their scores must not be presented as landing measurements or as a before/after improvement. The valid final record is `final-landing-lighthouse.json`.

## Checks and scope boundaries

- Web: **316 passing tests across 48 files**, type check clean. Nine tests exercise release input validation; other new tests cover title/safety order, buffering cancellation, focus recovery, route error/reset.
- Configured local production build succeeds. Current real-input local `preflight:release` correctly exits 1 for the missing API base.
- Local demo authentication: resident, dispatcher, DMO, responder, admin sign in and survive reload. Resident `/my`, `/my/report`, `/my/reports/demo-report-05`; admin `/admin`, `/dashboard`, `/map`, `/teams`, `/users`, `/monitor`, `/assignments`, `/analytics`, `/audit`, `/incidents/demo-report-01` render without recorded page exceptions or overflow. These are regressions, not full design audits of those pages.
- Impeccable launcher failed with execute permission denied; no detector result is claimed and no suppression was added. Existing sidecar drift was left untouched.
- Not verified: physical iOS/Android, screen-reader speech, deployed TLS/cache/security headers, real API reachability/sign-in, complete backend/rules audit, Flutter device rendering.
- No report creation, account creation, staff mutation, production access, commit, push, or deployment in this pass.

## Next audit phases

1. Sign-in, registration, Forbidden: typography, phone form order, field validation/motion, provisioning/recovery, keyboard and loading/error states.
2. Resident hub, report form, report detail: active/empty/long/offline states, location/evidence affordances and submission recovery.
3. Staff and admin: populated queue/map/details, assignment dialogs, notifications, teams/users, monitor, analytics/export, audit log.
4. Shared motion/performance and release checks across all routes; then native Flutter device classes when hardware/simulator is available.
5. Hosting configuration, API/rules/security, owner-supplied privacy/hotline decisions, staged deployment verification. No deployment is authorized by this audit.

See `CLAUDE-NEXT.md` for the continuation prompt and `evidence/REPRODUCE.md` for measurement provenance.
