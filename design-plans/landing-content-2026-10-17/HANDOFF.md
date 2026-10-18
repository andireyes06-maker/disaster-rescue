# Landing continuation after the access-page handoff

October 17, 2026. Airen asked Codex to continue after the header refinement. Nothing committed, pushed, or deployed.

## Delivered

- The header now has a deep-indigo masthead, larger branding, clear service descriptor on desktop, brighter navigation, and visible staff access. It keeps the demo notice separate and preserves the measured sticky-header offsets. Read `../header-presence-2026-10-17/HANDOFF.md` for that pass.
- Hero copy now names what the service does: residents report emergencies and locations, follow updates, and connect with the people reviewing/coordinating incidents. The headline and safety warning remain unchanged.
- A ruled question-and-answer section explains the information needed, optional photos, review after submission, and account access. The answers are grounded in the actual resident form, role guard, and report workflow; no response timing, hotline number or privacy claim was invented. Native disclosure controls work with keyboard and preserve default semantics. The existing detail-content motion and an animated chevron provide feedback; reduced motion stays static.
- A closing action gives residents a route to account creation or sign-in after reading. Its deep-indigo surface ties into the masthead and the film.

This follows the existing design world rather than replacing it. Existing video playback, chapters, buffering cancellation, reduced-motion/save-data behavior, error focus recovery, registration/provisioning, role guards, resident-main landmarks, staff table access and Claude’s other repairs are preserved.

## Files

- `web/src/components/PublicHeader.tsx`: optional service descriptor, existing resize observer retained.
- `web/src/pages/landing-header.css`: scoped landing masthead; light access headers remain unchanged.
- `web/src/components/LandingQuestions.tsx`: native reporting disclosures.
- `web/src/pages/landing-story.css`: questions and closing composition, phone/text scaling and high-contrast styling.
- `web/src/pages/Landing.tsx`: clearer service copy, questions and closing action.

## Verified

- Web suite: 319 tests across 48 files pass; type check clean. Configured local production build succeeds. The build uses explicit local/demo audit configuration and must not be deployed. Hosting release inputs remain owned by the release gate and hosting provider.
- Chromium: complete page with all four answers open at 320, 390, 768, 1024, 1440 and 1920px. Zero axe violations, zero visible interaction targets under 44px and no horizontal overflow. `evidence/final-audit.json`.
- Chromium/Firefox/WebKit: phone, 200% root text, landscape, media fallback and forced colors with answers expanded. All 15 scenarios have zero final axe violations, no page exceptions and no horizontal overflow. `evidence/edge-checks.json`. These are emulated checks, not physical device or actual browser-zoom measurements.
- All three engines: Enter opens, Space closes, focus outline visible, chevron reflects open state, zero question-section animations in reduced motion, and the closing action reaches the registration form. `evidence/interactions.json`.
- Viewed desktop/phone header images and phone reporting-question and closing-action captures. The question element screenshot includes the sticky header overlay at the current scrolled position; full-page captures provide complete section context.
- Lighthouse was not rerun after Claude’s access fixes or this header/content continuation. The earlier 94/100/100/100 run belongs to the prior landing hardening build; do not relabel it as this build’s score.

## Known handoff state

Claude’s release-audit LEDGER records read-only verification of all five Vercel client-variable names and the committed effd53f bundle using the Render API with no localhost. This supersedes treating the local missing API variable as evidence of missing hosted settings. Hosting inputs were not re-inspected in this pass. The new working tree is not the deployed commit.

The remaining staff type-scale and save-focus gaps, marker interactivity, protected-route loading, populated/empty/error staff states, registration error-branch browser checks, screen-reader speech, physical devices, Flutter and real release verification remain open. The root audit LEDGER remains authoritative for those findings. No suppression was added and the Impeccable detector was not run; its launcher previously failed on execute permission.

## Continue

Preserve Claude’s access/resident fixes and the new landing direction. Continue the open ledger with staff typography and save-focus recovery, then populated staff and error/loading states. Keep the factual hotline/privacy/mobile limitations until the owner supplies real content. Use only the isolated demo emulator for data checks. Do not touch the unrelated 127.0.0.1 Flutter process or production services, and do not commit/push/deploy without instruction.
