# Route audit, October 17, 2026 (continued)

Environment: web on 5174 (demo mode, project `demo-disaster-rescue`, demo API on 3102, Auth 9299, Firestore 8190). Demo accounts only. Read-only except for sign-in/out and, in one check, a simulated GET failure in the browser tab. No report was submitted and no staff action was taken.

## Safety fixes (this pass)

- Stopped the local API on port 8080 (`node --env-file=.env src/server.js`, project `flutter-5094e`). Credentials and production data were not opened or changed.
- Removed the implicit `localhost:8080` API fallback. `VITE_API_BASE_URL` is required. A missing or invalid value shows a configuration error (`ApiConfigGate`) and fails requests before any network call (`apiBaseUrl()` in `web/src/api/client.ts`).
- Tests: `src/api/config.test.ts`, `src/components/ApiConfigGate.test.tsx`, and a no-request regression in `src/api/client.test.ts`. `src/test-setup.ts` gives every test one fake API address.

## Automated

| Check | Result |
| --- | --- |
| `web: npm test` (typecheck + Vitest) | 279 pass, 42 files |
| Contrast checker sanity sample (#c8c8c8 on white) | Flagged at 1.67:1, so zero results below are real |

## Contrast (WCAG 4.5:1 body, 3:1 large), 1440px, direct text nodes

No failures on: `/`, `/login`, `/register`, `/forbidden` (signed out); `/my`, `/my/report`, `/my/reports/demo-report-05`, `/my/reports/no-such-report` (resident); `/dashboard`, `/map`, `/incidents/demo-report-01`, `/analytics`, `/audit`, `/teams`, `/users` (dispatcher); `/admin`, `/monitor`, `/assignments` (admin).

Not covered by this check: placeholder text, input values, focus-ring contrast, disabled controls.

## Keyboard

- Resident dashboard: Tab 1 reaches the brand link (3px violet focus ring). Tab 2 reaches "Skip to content" and shows it on focus. Enter moves focus to `#resident-main`.
- Staff, access, and resident pages: skip links present and targets found by DOM check (see the earlier review file).
- Not checked: full tab order on every route, and focus order inside modals and maps.

## Reduced motion

- Browser emulation `prefers-reduced-motion: reduce`: resident dashboard has zero running animations.
- Stylesheet review: the skeleton pulse sits in a `no-preference` block; the resident motion file disables animation and transition under `reduce`.
- Not checked at runtime: staff routes under reduce.

## Loading, empty, error, retry

| Surface | State | Result |
| --- | --- | --- |
| Audit log (`/audit`) | Loading | Before: "Loading..." text only. After: labelled status with six skeleton blocks (verified in browser and by `AuditLoading.test.tsx`) |
| Audit log | Failure (simulated 503 on GET) | Alert "Could not load the audit log..." with "Try again" |
| Audit log | Retry after failure cleared | Alert clears; 126 rows load |
| Audit log | Empty filter | `EmptyState` "No audit entries match these filters" (code review) |
| Analytics | Loading | Before: text only. After: labelled status with three chart-height skeletons (`AnalyticsLoading.test.tsx`) |
| Resident list (`/my`) | Empty, error, retry | Code review only: "You have no reports yet.", "Try again" banner. The list reads Firestore directly, so a browser fetch simulation can't reach it |
| Report detail missing | Not found | "We could not find this report" with a way back (browser) |

## Long content

- Report description at 390px: 901 of 1,000 characters with a long unbroken word. No document overflow; the counter updates. The only overflowing elements are Leaflet map tiles, clipped by their container.
- Other routes: not checked with long data.

## Authorization

Route matrix at 390px, all five roles: allowed routes load; disallowed routes show "Access denied" (see the earlier review file). Unchanged by this pass.

## Pending

- Native (Flutter) device or simulator checks: **pending**. No device or emulator is set up. `flutter analyze` and `flutter test` pass on the source; that is not device verification.
- Reticle integration: deferred at Airen's request.
- Vercel: confirm `VITE_API_BASE_URL` is set for the production project before the next deploy.
