# Landing video handoff

Airen approved creation and hero integration of a silent 12–18 second product animation. Delivered a 16-second Hyperframes film with three scenes: pin/report → review/assign → receive an update. It matches the current violet/indigo/Geist system, uses schematic/sample data, and makes no operational claims.

Open `videos/rescue-response/README.md`, `BRIEF.md`, `STORYBOARD.md`, and `renders/contact-sheet.jpg` for source, timings, assets, and commands. The master MP 4 and compact 584152-byte website MP 4 are finished. Website integration is `web/src/components/LandingFilm.tsx`, used by `Landing.tsx` and styled in `landing.css`. The old `ProductScene` remains the error fallback.

Playback autoplays silently in normal viewing and is muted, inline, and looping with a visible pause control. Reduced-motion/save-data default to a poster without a video request. Explicit Play remains available; offscreen/hidden-tab video pauses. Failed media returns the original illustrative workspace. Accessible summary and sample-data labeling remain outside playback.

Verified: strict Hyperframes lint/runtime/layout/contrast; visual scene/cut review; FFprobe 16-second 30 fpsH.264 delivery;302 passing web tests across 46 files and successful build; real playback/pause/offscreen/reduced-motion behavior in Chromium, Firefox, WebKit at 1440/390/320 px. No overflow or recorded page exceptions. Details and limits are in the video README. Physical-device and screen-reader checks remain open. No production operations, commit, push, or deployment.

## Promotional revision

The current master is `videos/rescue-response/renders/rescue-response-promo-master.mp4`; the original master remains as an earlier version. Source headlines are now larger and reveal by word; a moving cursor demonstrates the pin/submit/assign actions; camera easing returns to shared geometry at the cuts; the ending holds its information instead of fading to blank white.

The player adds three scene buttons with actual-media progress, dynamic descriptions, and seek/resume at 0, 5, and 10.5 seconds. Selecting a chapter from the reduced-motion poster waits for metadata and starts the requested scene. Autoplay is explicit both in markup and playback code; browser refusal still leaves manual Play available. Do not remove offscreen/hidden-tab pause, reduced-motion/save-data defaults, or the fallback.

Verified in Chromium/Firefox/WebKit at 320/390/1440px: real autoplay, mouse and keyboard chapter selection, pause/resume, progress, offscreen pause/return resume, reduced-motion poster with no MP4 request until explicit play, no overflow or page exceptions. See `evidence/landing-promo-checks.json`. The final Hyperframes check has zero findings and 90/90 contrast checks. Physical devices and screen readers remain open.

## Prompt for Claude

Read `design-plans/codex-redesign/LANDING-VIDEO-HANDOFF.md` and `videos/rescue-response/README.md`, then inspect the actual landing at `http://localhost:5174/`. Codex created and integrated the 16-second Hyperframes film Airen approved. Preserve the source project, compressed delivery/poster, pause/play controls, reduced-motion/save-data behavior, offscreen pause, truthful sample labeling, and original-workspace fallback. Preserve all previous design, motion, notification focus/stagger, skeleton, validation, and backend repairs. Use relevant installed skills when editing; do not restart from old static-motion instructions. Continue only demonstrated review findings and outstanding device/screen-reader checks. Report evidence and limits accurately. Do not touch production, commit, push, or deploy without Airen's instruction.
