# Reproducing the landing audit

Run the app on localhost:5174 with the isolated demo emulator for route checks. All signed-in checks used demo accounts, performed sign-in/out and read-only page visits, and did not submit reports or perform staff mutations.

Browser checks: Playwright Chromium 156, Firefox 155, WebKit 27.2. Firefox and WebKit use explicitly cached executables because the installed Playwright package expects newer cache revisions. Request interception was unsupported by the cached Firefox protocol; the media-error scenario instead pointed the poster to a missing local asset.

Automated accessibility: axe-core installed in /tmp/rescue-landing-audit-tools, with WCAG 2 A/AA, WCAG 2.1 AA, WCAG 2.2 AA, and best-practice tags. Screenshots and JSON include viewport dimensions. The text-200 cases set the root font size to 200%; this is a text-scaling check, not a claim of physical browser zoom testing. Forced-colors checks are browser emulation, and the tap was synthesized in Chromium.

Production checks: build explicitly with local-only API URL and demo Firebase client values, then serve dist via Vite preview on localhost:5180. The plain build supports local inspection; build:release deliberately rejects those local/demo values. Never publish the audit build. Assert that the hero and footer exist and the configuration-error screen is absent before running Lighthouse.

Lighthouse runs are local mobile simulations, not live-site or physical-device measurements. Two early runs measured the configuration-error screen because VITE_API_BASE_URL was absent. They are retained in rejected-configuration-screen-runs for provenance and MUST NOT be presented as landing measurements or compared as a before/after performance gain.

Loading fixture screenshots render the real LandingLoading component in isolation. Home.test.tsx separately verifies that unresolved session state selects it; the fixture does not claim a delayed live authentication service. No native Flutter or screen-reader run is included.
