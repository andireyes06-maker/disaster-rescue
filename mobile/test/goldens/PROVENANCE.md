# Golden references (Flutter native visual tests)

Status: **reviewed Harbor redesign widget references, 20 October 2026.** The owner selected a light workspace with dark header and authorized the full Flutter redesign. These are reviewed widget renders, not physical-device approval. Historical origin and earlier reviews remain below.
Changing a reference requires a reviewed visual decision, recorded here, and must not be done merely to make a regression pass.

## Origin

- Source folder (untracked, original project): `/Users/rien/Documents/FINAL_PROJECT/design-plans/codex-redesign/native/`
- Captured: 17 October 2026, 11:44 to 11:45 (file times). The Codex native review log for this set is
  `design-plans/codex-redesign/checks/codex-native-captures.log`, which records a passing run of the visual suite with these files.
- Generation command: **not recorded** in the source log. Do not treat any command here as the original generator.
- Copied unmodified into `mobile/test/goldens/` on 18 October 2026. Checksums: `SHA256SUMS.txt` (SHA-256 of each PNG).

## Test setup these references assume

- Test file: `mobile/test/redesign_visual_test.dart`. Each capture uses a 390 by 844 logical viewport at device pixel ratio 1.
- Flutter 3.44.8 (stable), Dart as bundled, macOS arm64 test host. Current font: bundled Geist variable TTF declared in pubspec.yaml and loaded explicitly by the visual harness. SDK Roboto and MaterialIcons remain test fallbacks. Earlier historical references used SDK Roboto.
- Fixture data: fictional, defined in the test file (for example `sample@demo.test`, Harbor sample teams). No real person, address or
  phone number. A draft-store fixture was changed from a realistic number to `09170000001` on 18 October 2026, outside these images.

## Regenerating (only after a reviewed visual change)

`flutter test --update-goldens test/redesign_visual_test.dart` from `mobile/`, then review every changed image, record the change
and the reason in this file, and update `SHA256SUMS.txt`. Never run it to make a failing comparison pass without that review.

## Reviewed change: required markers (F08), 18 October 2026

Reason: the audit's F08 finding and the approved spec require the required-field convention on native forms. Required text fields
get a visible `*` and a `, required` semantics label. Required selections (the report type and location steps) get a visible
`* Required` line and a labeled group. Phone is marked only where the form requires it (report details: `validatePhone` rejects
empty input). Register Phone stays `(optional)`.

Regenerated with `flutter test --update-goldens test/redesign_visual_test.dart`. Four images changed; the other eleven were
byte-identical after regeneration, so the change is limited to these four. Each changed image was inspected visually against its
previous version:

- `register.png`: `*` added to Full name, Email and Password only. Phone (optional) unchanged. Diff about 0.03%.
- `report-details.png`: `*` added to What is happening?, Your name and Phone number. Diff about 0.03%.
- `report-type.png`: `* Required` line added under the description, and the tiles move down with it. Tile content unchanged.
- `report-location.png`: `* Required` line added, and the choices move down with it. The address field is still `(optional)`.

The two step images differ by a vertical shift, so their pixel difference is larger (about 14% for report-type). This is layout,
not a content change. Checksums: `SHA256SUMS.txt` (four lines changed, fifteen entries verified).

## Verification on 18 October 2026

- `flutter test` in `mobile/` with these references in place: 128 of 128 passed (see the integration round 3 record).
- The golden tests no longer depend on the external `design-plans` folder: the reference path is `goldens/<name>.png`.

## Reviewed repair references, 19 October 2026

The owner authorized completing the local repair pass. Reviewed the changed phone captures before accepting their references: `login.png` adds required labels and the neutral password-recovery section; `assignments.png` adds Active/Recently closed tabs. The list-window notices appear only when a window is full; their small-list references remain unchanged. Text, controls, spacing and contrast remain legible at 390px, with no clipped content in these fixtures. Exactly two references changed; the other thirteen match the previous reference bytes. This is a reviewed local widget rendering decision, not a physical-device approval or a signed release. SHA256SUMS.txt records all fifteen references.

## Reviewed change: response form required markers, 19 October 2026

Reason: the response form's "Status" and "People rescued" fields are required, so they now show the required asterisk (kept on purpose; do not revert). Regenerated with `flutter test --update-goldens test/redesign_visual_test.dart`. Only `response-update.png` changed; the other fourteen references were byte-identical. The isolated diff contains only the two asterisks (`Status *`, `People rescued *`). Reference SHA-256 is now `48104a67...b750` (was `92feed2d...bf1bb6f4`). This is a reviewed marker change, not a layout or content change.

## Reviewed change: incident detail progress history section, 19 October 2026

Reason: the responder incident detail now has a bounded "Progress history" section below the actions. The golden test's fake repository never emits history, so the captured reference shows the section in its loading state ("Loading progress history"). The rest of the page is unchanged. Regenerated with `flutter test --update-goldens test/redesign_visual_test.dart`. Only `incident-detail.png` changed in this round, and the visual check of the old and new images confirmed that the only difference is the added section. Reference SHA-256 is now `4c35f584...068aeb` (was `1b1d3681c8664b048ef87ee992046e11a882211ebe6ec5e58dad08a85dcfaaa3`). The populated states (entries, empty, error) are covered by `test/progress_history_test.dart` and are not pixel-captured.

## Reviewed redesign: Harbor light workspace, 20 October 2026

Owner direction: “Light workspace, dark header (Recommended)”, preserving the website’s purple/harbor identity. Full design replacement was requested, including resident and responder screens. No staff native workspaces were added.

Generated into a separate candidate directory with `GOLDEN_REVIEW_DIR=/private/tmp/flutter-redesign-2026-10-20/candidate-goldens flutter test --no-pub test/redesign_visual_test.dart --update-goldens`. All 15 candidate images were viewed individually before copying them to this reference set. Earlier 15 images remain in the redesign evidence backup. This is an intentional new design reference, not an attempt to clear an unexplained regression.

Reviewed changes, every image:

- login and register: dark app bars, measured white form sheet, Geist hierarchy, stronger field boundaries, required labels and preserved reset/consent controls.
- profile: actual account data rows, separate privacy panel and logout.
- report-type: compact descriptive situation rows, explicit progress steps and radio indicators.
- report-location: grouped honest selection state, GPS/map controls and optional landmark field.
- report-details: clear description/photo/contact hierarchy and stronger field boundaries.
- report-review: grouped real report data, safety notice and primary submission action.
- my-reports and assignments: structured incident cards with status, reference when available, location and time.
- notifications: unread icon tile and readable message hierarchy.
- response-update: grouped status and input controls; required markers retained.
- incident-detail: grouped incident/location, operational actions, progress history loading state. The fixture does not emit progress history; this reference does not verify populated history.
- map-tile-free: shaped map viewport, existing filter/marker/list. Tiles deliberately disabled in the harness; gray field is intentional and does not prove live tile loading.
- offline-recovery and submission-result: coherent recovery/receipt panels and preserved truthful copy.

Independent Impeccable review found faint input outlines/radio glyphs; candidates were rerendered after the dedicated control-outline token was added. Actual Chrome phone/desktop captures supplement these standalone widget references and exercise the navigation dock/rail. No Android/iOS hardware, release-signing or device-performance approval is implied.

Font source: Google Fonts `ofl/geist/Geist[wght].ttf`, upstream Geist by Vercel, SIL Open Font License. Bundled license `assets/fonts/OFL-Geist.txt`. Font SHA-256: 73894e0448cae90a92b6c2f8732b7bb9acb7b94c418bff559dad4a18e1de9659.

## Reviewed change: responder location line, 27 October 2026

Reason: the responder incident page showed raw latitude and longitude under Location. It now shows the approximate place name the reporter's pin was given (for example "Near Commonwealth, Quezon City"), or "Exact pin is on the map." when a report has no name. Owner request, 27 October 2026.
Reviewed: `incident-detail.png` regenerated with `--plain-name "assignment, incident"`. Only the coordinates line changed; the rest of the layout is identical.
Not covered by this entry: `report-details.png` still differs from its reference by 8.87% (scroll offset in the details step). It is unresolved and has not been regenerated.

## Reviewed change: no coordinates on the responder page, 27 October 2026

Reason: the responder incident page no longer shows coordinates. It shows the approximate place name, falling back to the area, then "Place not named". Owner request, 27 October 2026.
Reviewed: `incident-detail.png` regenerated; only the coordinates line changed to "Place not named" for this fixture, which has no name or area.

## Reviewed change: responders have no reach radius, 27 October 2026

Reason: the radius and distance were resident-only. The responder page no longer shows "You are N m from this incident" or the "too far" banner, and updates are no longer limited by distance on the server. Owner request, 27 October 2026.
Reviewed: `incident-detail.png` regenerated; the distance line and banner are gone, and the rest of the layout is unchanged.
