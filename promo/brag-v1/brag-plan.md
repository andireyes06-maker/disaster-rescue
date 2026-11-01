# Brag Plan: Rescue Reports

## What is this app?
Rescue Reports lets residents submit emergency reports from a phone with photos and location, and lets administrators validate them, assign rescue teams, and keep everyone following the same incident record.

## The angle
This is a serious product, so the brag is confidence, not jokes. The video shows one report travelling through the real flow and ends on the promise in the product's own headline: "Report clearly. Respond together." The restraint is the point: no gimmicks, the product doing its job.

## Hook (first 2-3 seconds)
A clean light screen. "Report clearly." lands, then "Respond together." settles beneath it. These are the landing page's own headline words.

## Key moments (the middle)
- A resident's phone shows a new flood report: "Flood report", "Riverside District", photos added, location pinned.
- The administrator inbox fills with three incidents one by one (Flood, Fire, Landslide), each with its priority badge. The flood report is validated and "Assigned to Harbor Rescue Unit" appears.
- The resident's phone history builds up as the report moves: Report submitted, Validated by administrator, Team assigned, Response in progress. A field update lands: "Team reached the access point."

## Outro / punchline
The headline returns, then one safety line stays on screen long enough to read: "If you are in danger, call your local emergency hotline." This keeps the video honest about what the app is.

## User flow worth showing
1. Entry: resident writes the report on the phone, adds photos, pins the location ("Show what happened").
2. Key action: administrator validates the report by hand and assigns a team ("Connect the response").
3. Result: resident sees each status change and the field update ("Stay informed").

## Tone
- Preset: polished
- Creative direction: calm, trustworthy product film for a serious tool. Confidence through restraint.
- Interpretation: slower holds, soft transitions, no jokes, no hard cuts. Motion stays smooth and energetic, but text never flashes.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: #F5F6FA (`--color-bg`, web/src/theme/tokens.css)
- Surface: #FFFFFF
- Text: #211D35
- Accent: #6D28D9 (primary purple, `--color-primary`)
- Accent soft: #EFE8FF
- Harbor (dark panel): #241747
- Priority colors: Flood #1D4ED8, Fire #C2410C, Critical #B42318, High #8A5100
- Display font: system sans-serif, bold (the project declares no web font; use the system stack)
- Body font: system sans-serif
- Strongest visual element: the landing page's response workspace (incident inbox, district map, "Assigned to Harbor Rescue Unit" card) and the phone "My reports" card with its status history

## Share copy (draft)
Report clearly. Respond together. Rescue Reports connects residents with the teams reviewing each incident.

## Audio direction
- Role: warm, low music bed with restrained UI accents
- Music: happy-beats-business-moves-vol-1-by-ende-dot-app.mp3 (upbeat business bed, kept low under the message)
- Music treatment: starts at 0.0s, low volume, gentle fade-in over 0.6s, fade out over the final 1.5s under the closing line
- Music cue guidance: no cue preset is bundled for this track; detect cues at composition time (`npx hyperframes beats`). Target one strong cue for the phone-to-inbox transition, and one for the "Assigned to" card. Beat-grid snap for the three inbox rows, but only every other beat, so each row is readable.
- Audio-reactive treatment: subtle. Use music energy to add slight glow on the purple accent behind the headline. No waveform or equalizer visuals.
- SFX posture: sparse, motion-matched. Soft card sound for each inbox row, a short confirmation tick for "Validated" and "Team assigned", nothing on the outro.
- Audio-coupled moments:
  - Inbox rows arriving one by one: soft card sound per row
  - Status badges changing in the phone history: short tick
  - Final line: no SFX, music fades
- Restraint rule: no alarm sounds, no sirens, no whooshes that feel like urgency. This is a calm product film.

## Storyboard

### Scene 1 — Hook — 2.5s
On screen: "Report clearly." then "Respond together." (landing page H1 verbatim). Light background, purple accent rule.
Sequential/interaction: none
Audio intent: a clean open, one soft tick
Audio-coupled idea: none
Music: low bed starts
Transition mood: soft → Scene 2

### Scene 2 — Reveal — 2.5s
On screen: product mark "Rescue Reports" with the descriptor "Incident reporting & response". Dark harbor panel (#241747) sweeps in behind the wordmark.
Sequential/interaction: none
Audio intent: quiet confidence
Audio-coupled idea: none
Music: bed continues
Transition mood: soft crossfade → Scene 3

### Scene 3 — Show what happened — 4s
On screen: a phone frame with the report form in progress. Title "Flood report", place "Riverside District", photo tiles added (labelled "Photos (required, up to 5)"), location pin placed. Caption: "Show what happened". Sub line (held): "Describe the emergency. Add photos, and pinpoint where help is needed."
Sequential/interaction: yes. Pin drops, then the photo tiles appear one after another. Sub line holds at least 1.2s after it finishes typing.
Audio intent: the resident acts, a light tap for each photo
Audio-coupled idea: beat-grid for the photo tiles (every other beat)
Music: bed continues
Transition mood: slide → Scene 4

### Scene 4 — Connect the response — 4.5s
On screen: desktop inbox titled "Incident inbox" with three rows that arrive one by one: "Flood report / Riverside District / Critical", "Fire report / Market Quarter / High", "Landslide report / Hillside Road / Medium". The flood row is selected. Caption: "Connect the response". Sub line (held): "An administrator reviews the report, validates it by hand, and assigns a rescue team." Then the card "Assigned to Harbor Rescue Unit" appears.
Sequential/interaction: yes. Three rows arrive one by one (every other beat), then the validation badge and assignment card appear in order. Each row holds long enough to read before the next arrives.
Audio intent: the team is organised, one soft card sound per row
Audio-coupled idea: strong cue locks the "Assigned to" card
Music: bed rises slightly for this scene
Transition mood: slide → Scene 5

### Scene 5 — Stay informed — 3.5s
On screen: phone "My reports" card for Flood report with status history: "Report submitted", "Validated by administrator", "Team assigned", "Response in progress". Latest update card: "Team reached the access point."
Sequential/interaction: yes. The four history rows tick on one after another (each with a short check), then the update card slides in.
Audio intent: progress, small confirmations
Audio-coupled idea: tick sound per history row, beat-grid snap at every other beat
Music: bed continues
Transition mood: soft → Scene 6

### Scene 6 — Outro — 3.5s
On screen: "Report clearly. Respond together." (both lines, smaller than Scene 1). Below, a single safety line held long enough to read in full: "If you are in danger, call your local emergency hotline."
Sequential/interaction: none
Audio intent: calm close
Audio-coupled idea: none
Music: fades out over the final 1.5s
Transition mood: soft fade to brand mark

**Music mood for this video:** upbeat but low (warm business bed), not comedic.
**Audio summary:** a quiet bed under the whole film, one soft card sound per inbox row and tick per status change, rising slightly for the response scene, fading out under the safety line.

**Scene durations:** 2.5 + 2.5 + 4 + 4.5 + 3.5 + 3.5 = 20.5s (within 15-25s).

## Grounding check
Every line on screen is from the project: the landing page headline, "Incident reporting & response", "Photos (required, up to 5)" (phone form), the sample incidents and assignment card in the landing page's response scene, the phone history labels in the landing page's resident card, the emergency line in the landing page's safety notice. No invented claims. No real names, emails, phone numbers or locations: all places and names are fictional samples from the landing page.
