# Cross-browser motion, focus, and performance, October 17, 2026 (Claude)

Engines: Chromium 156.0.8078.4, Firefox 155 (Nightly build 1543), WebKit 27.2 (build 2359), all headless, via Playwright 1.64.1 against the local dev server (5174, demo emulator, project `demo-disaster-rescue`). Widths: 1440×900 and 390×844. Timing was sampled in-page on the document timeline or with `requestAnimationFrame`, so tool-call latency does not affect it. Raw runs: `evidence/cross-browser-motion-2026-10-17.json` and `evidence/cross-browser-frames-2026-10-17.json`.

## Defects found and fixed

| Defect | Demonstrated by | Fix |
| --- | --- | --- |
| Notification rows did not stagger. The `li:nth-child(n)` delays had lower specificity than the `[data-state="open"]` shorthand, which reset `animation-delay` to 0. | Before the fix, the sampled row animation reported delay 0. After the fix, per-row delays are measured as 0, 35, 70, 105, 140ms in all six runs. The old sampler merged the five rows into one entry, so the pre-fix per-row delay was not recorded separately. | Same-specificity delay rules under `.notification-panel[data-state="open"]` (`product-motion.css`) |
| Escape moved focus only after the 160ms exit, so focus sat on the closing panel's close button. A keypress in that window was lost: reopening produced 0 panels in all three engines. | Probe, before the fix: focus on `notification-panel__close` at the Escape moment and at 190–204ms removal. Reopen lost. | Focus moves to the bell when Escape or the close button fires (`onEscapeKeyDown`, close `onClick`), so the exit no longer holds focus. |
| Reopening during an exit reused the mounted panel, so focus stayed on the bell instead of entering the panel. | Interruption check, before this fix: `focusInPanel: false`. | Effect focuses the panel's close button when `open` becomes true. After the fix: `focusInPanel: true` in all six runs. |

## Results after fixes (all six engine × width combinations)

| Check | Result |
| --- | --- |
| Row stagger delays | 0, 35, 70, 105, 140ms; duration 280ms each |
| Keyboard open | Focus enters the panel |
| Escape close | Focus on the bell at the Escape moment. `notification-close` runs 160ms; panel removed about 183–204ms later |
| Interruption: Escape then Enter during the exit | One panel, `open`, pointer events on, focus in panel |
| Scroll inside list | Wheel moves the list 400px of 2,226px; the page does not scroll |
| Forward navigation (`/my` → `/my/report`) | Content and band animate; persistent navigation does not (`persistentNavAnimated: false`) |
| Back navigation (history POP) | Content moves from −10px; push moves from +10px (probe, all engines) |
| Reduced motion | Zero notification and route animations; landing content visible; `scroll-behavior: auto` |
| Horizontal overflow | 0 on every route checked in each run |
| Landing sequence | All elements run and settle at opacity 1 |

## Frame timing (browser-side, rAF, headless)

| Engine | Landing p50 / p95 / max (ms) | Open p50 / max | Close p50 / max |
| --- | --- | --- | --- |
| Chromium | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 | 16.7 / 16.8 |
| Firefox | 16.7 / 18.3 / 18.6 | 16.6 / 18.5 | 16.6 / 43.5 (one frame) |
| WebKit | 17 / 19 / 51 (one frame) | 17 / 18 | 17 / 18 |

Repeated landing runs (four each): Firefox had one 52ms frame in one run. WebKit had one 36–47ms frame in four of four runs. An A/B run of WebKit with and without motion was inconclusive: the reduced-motion run also produced a 44ms frame, and the first motion run was a cold start. The WebKit frames are not attributed to the animations.

## Performance trace (Chromium only)

A DevTools trace covered the landing, sign-in, notification open, and close. Two long tasks were over 50ms:

- 91ms at 4.8s: `v8.evaluateModule` (module evaluation during page load)
- 70ms at 7.0s: `v8.produceModuleCache` (code cache)

Neither is animation work. Layout 36.5ms, paint 36.8ms, and style/layout-tree update 41.1ms across the whole trace. Firefox and WebKit have no Playwright trace tooling here, so their traces were not taken.

## Motion budget note

The landing's response-scene mask animates `clip-path`, which is a paint property on a large element. The design handoff lists "a bounded public panel mask" as an intentional budget item, so it is kept. Its cost is covered by the frame measurements above, not by a per-frame paint profile.

## Not verified

- Physical devices (iOS Safari, Android Chrome): pending. No hardware is available.
- Flutter (native): pending.
- Real GPU frame timing: headless rAF numbers are comparable across engines, but they are not device measurements.
- A regression unit test for reopen-during-exit: jsdom has no exit animation, so the path cannot be reproduced there. The browser runs above are the evidence.
- Screen-reader focus announcements after the change.
