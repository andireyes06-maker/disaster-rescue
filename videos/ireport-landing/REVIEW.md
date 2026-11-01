# I-Report landing film review — 27 October 2026

## Delivered direction

A new 16-second silent workflow film in the confirmed purple/harbor palette, with dark report and progress scenes and a light coordination scene. The exact pin SVG is extracted from web/src/components/Brand.tsx; no old cross remains in the new brand asset. The 66-second independent promo is untouched. The original Rescue Reports media remains available for rollback.

The narrative and chapter boundaries match the existing player: Report 0–5, Coordinate 5–10.5, Stay informed 10.5–16. All visuals are labeled illustrations rather than literal captures or live incidents. No promised rescue time or automatic photo verification is depicted.

## Verification

- HyperFrames 0.8.167 full check: zero errors, runtime/layout/motion/contrast pass. One intentional lint warning: the same brand SVG appears in header and closing lockup. Both placements are static images, with no audio or duplicated video.
- Inspected snapshot frames at 1, 3.8, 6.6, 8.8, 12.5, 14.8 and 15.52 seconds; exact logo visually checked in the report scene.
- Render: 1920×1080, 30fps, 480 frames, silent. Embedded encode: H.264, 1280×720, 30fps, 16 seconds, faststart.
- LandingFilm unit tests: 10 pass. Typecheck passes. Production build succeeds; existing chunk-size advisory remains.
- Actual Chromium playback at 1440 and 390: autoplay muted/looping, pause, both chapter jumps, poster preference fallback, explicit play, zero page exceptions and no horizontal overflow. See evidence/player-check.json.

## Scope and limits

This is a stylized workflow illustration. The map is schematic and the sample report is fictional. Small supporting text is secondary to the large headlines in the embedded view; player captions/chapters supply readable external context. Audio is intentionally absent to match the existing muted-autoplay placement. No new Firefox, WebKit, screen-reader or physical-device verification was performed. Nothing committed, pushed or deployed.

## Rebuild

Run npm run check and npm run render -- --quality delivery --fps 30 --workers 2 --output renders/ireport-master.mp4 from this directory. Encode for the website with ffmpeg at 1280×720, libx264 CRF23, yuv420p, faststart, no audio; extract the poster at 3.8 seconds. The website uses /media/ireport-response.mp4 and /media/ireport-response-poster.png. Chapter timings must be kept in sync with LandingFilm.tsx if duration changes.
