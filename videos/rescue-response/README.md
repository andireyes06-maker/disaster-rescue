# Rescue Reports landing film

Generated with the Hyperframes product-launch workflow for Airen on October 17, 2026. Silent illustrative motion graphics built from local HTML/SVG, the existing brand, and the self-hosted Geist font. No generative footage, external media, live incidents, or narration.

## Delivered

- Master: `renders/rescue-response-product-master.mp4`, 1920×1080, 30 fps, 16 seconds, about 3.5 MB. The original master is retained separately.
- Website: `../../web/public/media/rescue-response.mp4`, H.264 1280×720, 30 fps, 16 seconds, 584561 bytes, no audio, fast-start enabled.
- Poster: `../../web/public/media/rescue-response-poster.png`, 1280×720. PNG preserves interface text; this machine's FFmpeg build did not provide a WebP encoder.
- Contact sheet: `renders/promo-contact-sheet.jpg`.
- Editable frame compositions: `01-report` (0–5 s), `02-dispatch` (5–10.5 s), `03-update` (10.5–16 s).

The map/marker geometry is shared across clean match cuts. Scene one pins and submits a sample incident, scene two assigns a sample team and draws the route, scene three delivers a response update. The revised film uses larger word-by-word headlines, a demonstration cursor with click feedback, eased camera moves returning to shared cut geometry, and a held ending without an empty white fade. The current film uses Riverside District and Harbor Rescue Unit, with the footer “Rescue Reports · Response coordination.” The public player uses product language; fictional source provenance stays in this developer record.

## Edit and render

`package.json` pins Hyperframes 0.8.167. Node 22+ and FFmpeg are required. The plugin's bundled CLI launcher was absent, so the installed Hyperframes CLI rendered the checked project. Its workflow guidance/helpers were read from the available 0.8.61 bundle; standalone core/workflow skills were refreshed during setup. No website dependency was added.

From this directory:

```sh
npm run dev
npm run check
npm run render -- --quality delivery --fps 30 --output renders/rescue-response-product-master.mp4
```

`index.html` already assembles the three local frames. Keep frame durations/IDs consistent with `STORYBOARD.md`. If changing scene lengths, update host timing as well. GSAP is pinned and shipped in `assets/gsap.min.js`; preserve that local script path after any reassembly. All font/map/brand assets are local.

To regenerate the web delivery from the rendered master, from the repository root:

```sh
ffmpeg -i videos/rescue-response/renders/rescue-response-product-master.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart -an web/public/media/rescue-response.mp4
ffmpeg -ss 4.2 -i videos/rescue-response/renders/rescue-response-product-master.mp4 -vf scale=1280:720 -frames:v 1 web/public/media/rescue-response-poster.png
```

Studio preview started at `http://localhost:3002/#project/rescue-response`; it is local and was verified HTTP 200. Restart with `npx hyperframes@0.8.167 preview --background` if needed.

## Verification

- Strict Hyperframes check: no lint, runtime, layout, or contrast findings.90 sampled text checks passed. No separate authored motion-assertion file was supplied; animation was reviewed through sampled frames and the rendered output rather than claiming an enabled automated motion audit.
- Inspected scene and cut frames; replaced whole-scene crossfades because they double-exposed headings. The promotional contact sheet shows the clean cuts and readable held ending.
- Render: screenshot capture with hardware GPU; 16.0 seconds at 30 fps, rendered in 31.6 seconds after browser setup. FFprobe confirms H.264, 1280×720/30 fps web delivery with no audio stream and 16.000000-second duration. Fast-start atom ordering was checked.
- Website: 302 tests across 46 files pass, TypeScript clean, production build succeeds. Player tests cover explicit play, pause/resume, autoplay refusal, reduced-motion and save-data defaults, offscreen pause, live preference change, and failed-video fallback.
- Chromium 156, Firefox 155, WebKit 27.2 at 1440, 390, and 320 px: real decoded playback; muted/inline/loop properties; pause/resume; offscreen pause and onscreen resume; zero MP 4 requests by default in reduced-motion contexts; explicit Play works there. Poster loaded, no horizontal overflow, no recorded page exceptions.
- Browser screenshots and runtime record: `../../design-plans/codex-redesign/evidence/landing-video-*`. Logs, strict quality result, FFprobe metadata, and browser records are copied to `evidence/` here.

## Interactive promotional revision

Airen requested autoplay and a more interactive advertisement-like flow. The player now sets native autoplay as well as requesting playback, and has three keyboard-accessible scene buttons with media-clock progress. Chapter selection seeks to 0, 5, or 10.5 seconds and resumes playback, including starting from a reduced-motion poster before metadata arrives. Dynamic chapter descriptions keep the story readable outside the small video frame. Motion and data-saving preferences still default to a poster; explicit chapter selection or Play opts into playback.

The final source check has zero lint/runtime/layout/motion findings and 90/90 contrast checks. Initial validation caught digit-prefixed cursor identifiers; these were corrected before the final check. Camera overflow is intentionally clipped and annotated. Mid-scene snapshots, cursor keyframe diagnostics, and a decoded master frame were inspected. No authored motion assertion sidecar or device performance trace was added.

Cross-browser evidence: `../../design-plans/codex-redesign/evidence/landing-promo-checks.json` and nine `landing-promo-<engine>-<width>.png` screenshots. Chromium, Firefox, and WebKit passed actual autoplay, chapter seek/resume, keyboard chapter activation, media-clock progress, pause, offscreen/onscreen behavior, reduced-motion poster and explicit chapter play, with no overflow or page exceptions. Web tests and type checking pass; the production build succeeds. Physical devices and screen readers remain untested.

The website player lives in `web/src/components/LandingFilm.tsx`. It has a persistent 44 px pause/play control and a textual equivalent, respects reduced motion/save-data, pauses on hidden tabs/offscreen, and uses the original illustrative workspace if the video or poster fails. Native iOS/Android device playback and screen-reader announcement testing were not performed. Nothing was committed, pushed, or deployed; production was untouched.
