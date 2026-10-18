# Header presence follow-up

October 17, 2026. Airen asked for a header with more importance and asked Codex to wait for Claude’s access-page pass. This follows the supplied completion handoff. No commits, pushes, deployment or production changes.

## Changes

- Landing header now has the same deep-indigo ground as the product film, with a larger white wordmark and a 40px brand mark on desktop.
- A factual “Incident reporting & response” descriptor adds purpose beside the brand. It is hidden on narrow screens to keep the phone header compact.
- Navigation is brighter, larger and more readable; staff sign-in has a distinct outline and light focus ring.
- The demo/hotline notice remains in a separate quiet strip; wording and routing are unchanged.
- Tablet spacing keeps the three navigation links on one line. Phone navigation can wrap for enlarged text. Existing measured sticky-anchor offsets and the short-screen static header remain.
- Access-page headers and Claude’s landmark, field-focus, resident-main, touch-target and analytics-table fixes are preserved.

Implementation: `web/src/pages/landing-header.css`, the optional description on `PublicHeader.tsx`, and the landing invocation. Styling is scoped to `.service-site` so the access pages retain their light headers.

## Checks

- 319 web tests across 48 files pass, with type checking. Configured local production build succeeds.
- Chromium screenshots at 320, 390, 768, 1024 and 1440px; no header overlap or horizontal overflow; section headings clear the sticky header. Viewed desktop and phone renders.
- Chromium/Firefox/WebKit: phone, doubled root text, landscape, failed media and forced-color scenarios. All 15 scenarios have zero axe violations, no horizontal overflow or page exceptions. These are emulated checks, not physical devices or screen-reader speech.
- Login and registration at 390px remain free of overflow and retain the demo notice. Auth failure branches were not re-exercised by this header pass.
- Evidence: `evidence/header-checks.json`, `edge-checks.json`, screenshots, plus test/build logs.

## Hosting clarification

Claude’s supplied handoff and the existing release-audit LEDGER record that Vercel Production has all five client-variable names. The live bundle at commit effd53f uses the Render API and no localhost reference. Values were encrypted and not read. The original local production-env failure therefore does not establish missing hosting configuration. Keep the release gate; its actual hosting-input run and the new working tree’s deployment remain unverified. The audit REPORT now carries this update with attribution.

## Still open

The broader landing content/storytelling review, populated staff states, staff type scale, save-focus handling on other forms, marker interactivity, protected-route loading, remaining cross-browser auth/error paths, screen readers and devices remain separate work. Claude’s registration-failure focus branches are still not browser-verified. Do not call the whole website audited or deployment-approved based on this header pass.
