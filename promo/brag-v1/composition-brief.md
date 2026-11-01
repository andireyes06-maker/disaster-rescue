# Hyperframes Composition Brief: Rescue Reports

## Objective
Create a short, calm launch-style brag video for Rescue Reports.

## Output
- Composition directory: `brag-output-2026-10-27-145451/composition/`
- Rendered video: `brag-output-2026-10-27-145451/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20.5 seconds

## Source Material
- Project root: /Users/rien/Documents/FINAL_PROJECT-rescuer-web
- Primary files read: web/src/pages/Landing.tsx, web/src/theme/tokens.css, README.md
- Product name: Rescue Reports
- Tagline / strongest claim: "Report clearly. Respond together."
- Key UI moment to recreate: the landing page's response workspace (incident inbox with three priority-badged rows, "Assigned to Harbor Rescue Unit" card) and the phone "My reports" status history
- Copy that must appear verbatim:
  - "Report clearly."
  - "Respond together."
  - "Incident reporting & response"
  - "Show what happened" / "Connect the response" / "Stay informed"
  - "Flood report", "Fire report", "Landslide report"
  - "Riverside District", "Market Quarter", "Hillside Road"
  - "Assigned to" / "Harbor Rescue Unit"
  - "Report submitted", "Validated by administrator", "Team assigned", "Response in progress"
  - "Team reached the access point."
  - "If you are in danger, call your local emergency hotline."

## Creative Direction
- Tone preset: polished
- Creative direction: calm, trustworthy product film for a serious tool. Confidence through restraint. No jokes.
- Interpretation: slower holds, soft crossfades and slides, text never flashes. Pace comes from smooth motion, not from speed.
- Angle: one report travels through the real flow, and the video ends on the product's own promise.
- Hook: "Report clearly." then "Respond together." in the first 2.5s
- Outro / punchline: headline returns, then the emergency-hotline line holds long enough to read
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Alarm, siren or urgent whoosh sounds
  - Any text that is not in the project

## Visual Identity
- Background: #F5F6FA
- Text: #211D35
- Accent: #6D28D9 (primary), soft #EFE8FF
- Dark panel: #241747
- Priority colours: Flood #1D4ED8, Fire #C2410C, Critical #B42318, High #8A5100
- Display font: system sans-serif, bold (fallback; the project declares no web font)
- Body font: system sans-serif
- Visual references from the project: landing response workspace, phone "My reports" card, PriorityBadge, StatusBadge, "Incident inbox" panel

## Storyboard
Use the storyboard in `brag-output-2026-10-27-145451/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.5s — "Report clearly." / "Respond together."
2. Reveal — 2.5s — "Rescue Reports" + "Incident reporting & response"
3. Show what happened — 4s — phone report form: Flood report, Riverside District, photos, pin
4. Connect the response — 4.5s — inbox rows arrive one by one, validation, "Assigned to Harbor Rescue Unit"
5. Stay informed — 3.5s — phone status history ticks in, "Team reached the access point."
6. Outro — 3.5s — headline returns, emergency-hotline line held

## Audio
- Audio role: warm, low music bed with restrained UI accents
- Audio arc: quiet bed from the start, slight rise in scene 4, fade-out under the hotline line
- Music: happy-beats-business-moves-vol-1-by-ende-dot-app.mp3
- Music treatment: starts at 0.0s, low volume, 0.6s fade-in, 1.5s fade-out at the end
- Music cue guidance: no bundled cue preset for this track; detect with `npx hyperframes beats` at composition time. One strong cue for the phone-to-inbox transition, one for the "Assigned to" card.
- Audio-reactive treatment: subtle. Music energy may slightly glow the purple accent behind the headline. No waveform or equalizer visuals.
- Audio-coupled moments:
  - Photo tiles in scene 3 — light tap per tile
  - Inbox rows in scene 4 — soft card sound per row (every other beat)
  - History rows in scene 5 — tick per row
- SFX selection guidance: sparse and soft; prefer low high-frequency-risk files (see `<skill-dir>/assets/sfx/sfx-analysis.md`)
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume from the implemented animation.
- Audio files: copy the chosen music into `brag-output-2026-10-27-145451/composition/assets/music/`

## Hyperframes Instructions
Load the composition-building domain skills: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. Do not enter the `hyperframes` entry-point intent interview or its promo workflow.

Requirements:
- Show real UI copy and layout from the project (landing page response workspace and phone status card), with fictional sample names only.
- Keep all text readable: follow the reading-time floor in brag-plan.md (short label ~0.8s settled; sentence ~0.3s per word).
- Keep the video within 15-25 seconds.
- Include the music layer. Use at most 1-3 strong cue locks.
- Use local assets only.
- Run `npx hyperframes check` inside `brag-output-2026-10-27-145451/composition/` before render. Zero errors is the gate.
- Keep creation and rendering local.
