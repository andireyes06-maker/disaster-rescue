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

## Reviewed change: contact an admin on the sign-in page, 27 October 2026

Reason: a person who cannot reset their password can send a request to the administrators, who send the reset link from the website. The sign-in page shows "Contact an admin to reset it" under "Forgot password?". Owner request, 27 October 2026.
Reviewed: `login.png` regenerated; the only change is the new text link, and the layout is unchanged.

## Reviewed change: province removed from the report location step, 27 October 2026

Reason: residents no longer choose a province or city. The location step shows no dropdown. Owner request, 27 October 2026.
Reviewed: `report-location.png` replaced with the new render; the only change is the removed dropdown. `report-details.png` and `report-review.png` are not yet regenerated (the visual test stops at this step, and the details golden already had an open difference).

## Reviewed change: Change password on the profile screen, 27 October 2026

Reason: residents and responders can change their own password from the profile screen. Owner request, 27 October 2026.
Reviewed: `profile.png` replaced; the only change is the new Change password button above Log out.

## Reverted: Change password on the profile screen, 27 October 2026

The Change password button was removed again at the owner's request. `profile.png` is restored to the reference from before the button was added. No visual change remains.

## Restored: Change password on the profile screen, 28 October 2026

The owner asked for signed-in password change for residents and responders in the profile. The button is back above Log out. `profile.png` is restored byte-for-byte to the version reviewed under "Reviewed change" above (SHA-256 `cbc10be2…987044`). That render was viewed again before the restore and shows the button, nothing else changed. The dialog's own behavior is covered in `change_password_dialog_test.dart`, not in a golden.

## Regenerated: report details step, 28 October 2026

Reason: the earlier reference was captured at a different scroll position and still showed "How far does the danger reach?", a field severity replaced. The owner asked for the golden to be regenerated.
Reviewed: the new render was viewed before acceptance. It shows step 3 at the top of the form, with the severity field and no reach field. The "Your name" field is cut off by the Next bar, as expected for a scrolling form at phone height.
Method: `flutter test test/redesign_visual_test.dart --plain-name "four real report stages at phone width" --update-goldens`. The test passed on two consecutive full runs. No other golden was regenerated.

## Regenerated: report review capture, 28 October 2026

Reason: the earlier reference still showed the replaced "reach" field. The owner approved regenerating it.
Reviewed: the new render was viewed before acceptance. It is still step 3 of 4, not the review step: the test taps Next without a photo, so validation stops there and shows "Add at least one photo as proof." The render shows the severity field and no reach field.
Method: same test as report details, with `--update-goldens`. Only this file changed; `report-details.png` was byte-identical on the rerun.

## Hashes recorded: register and map-tile-free, 28 October 2026

Both committed images were viewed on 28 October 2026. Register shows the Create account form with required markers. Map-tile-free shows the incident map with one critical marker and its report card. Their widget tests pass against these images, so the stored hashes were stale. Only `SHA256SUMS.txt` changed; no image was regenerated.

## Reviewed change: camera and actual review stage, October28,2026

Owner requested Take photo alongside existing attachments. Codex reviewed separate candidate renders before updating references: report-details now shows Take photo and Choose existing photos, with the same required-photo rule and five-photo limit. report-review previously captured the Details screen with a missing-photo error because the visual fixture never attached the required photo. The fixture now supplies a synthetic valid photo and contact, asserts “1 attached”, and captures the actual Review step. That inspection also found scroll offset was retained from Details; the scroll view now resets per stage, with a regression. The reviewed reference shows Check and send at the top and the real report summary. Both images were visually inspected. Report-type and report-location candidate bytes are unchanged. Before/after images: design-plans/responder-web-audit-2026-10-28/implementation-evidence/mobile-goldens/. No device or real-camera verification is claimed by these images.


## Reviewed visual refinement: 28 October 2026

The owner authorized an aesthetic audit and fixes across web and Flutter, retaining purple/harbor branding and declining Android emulators. Candidate screenshots were generated outside the reference folder with GOLDEN_REVIEW_DIR=/private/tmp/ireport-visual-native-candidate and viewed before promotion. Exactly six references changed; nine are byte-identical. Reviewed decisions:

- report-type: incident-specific blue, ember, earth and green icon/selection treatments; radio labels and required markers retained.
- report-review: selected incident icon uses the same type color.
- my-reports: incident icon follows the shared type palette.
- assignments: clearer page title, actual active-count heading and ordering guidance, category color and tighter content groups. No fabricated totals.
- incident-detail: incident type heading/icon added above real status; location falls back to actual coordinates, and external map action has a measured width.
- map-tile-free: type-filter icons and map-list incident icons use the shared palette. The viewport remains tile-free in this fixture and is not live-map evidence.

All six changed images were inspected at 390x844. SHA256SUMS.txt records the updated set. These are reviewed widget references; they do not verify a physical device, camera, permissions or hosted services.

## Reviewed change: eight emergency types, 28 October 2026

Reason: Lifeline, Roadblock and Live Wire join the five types (spec `docs/superpowers/specs/2026-10-28-emergency-types-design.md`). Candidate renders were produced with `flutter test --update-goldens` for one test at a time and viewed at 390x844 before keeping them.

- map-tile-free: the Type filter is now one horizontally scrolling row of chips (eight chips wrapped onto several lines overflowed short screens by 58 px at 360x640). The last visible chip is cut off to show it scrolls. The map and list are unchanged. Command: `flutter test test/redesign_visual_test.dart --plain-name "assignment, incident, map and recovery layouts" --update-goldens`.
- report-type: eight choices in the same tile style, with Lifeline (rose, medical kit), Roadblock (olive, warning) and Live Wire (teal, bolt); the list scrolls under the Next button, so the fourth and later tiles are partly or fully below the 844 px fold in this render. Choosing Other adds a required "What kind of emergency is it?" field (covered by widget tests, not by this image). Command: `flutter test test/redesign_visual_test.dart --plain-name "four real report stages at phone width" --update-goldens`.

Only these two references changed; every other reference is byte-identical (checked with git status). Neither render verifies a physical device.

## Reviewed change: profile photo, 29 October 2026

Reason: residents and responders can set a profile photo on the phone (spec `docs/superpowers/specs/2026-10-29-final-change-requests-design.md`, B1). The candidate was rendered outside the reference folder with `GOLDEN_REVIEW_DIR=/private/tmp/ireport-task8 flutter test test/redesign_visual_test.dart --plain-name "access and account layouts at phone width" --update-goldens`, and both the old and the new image were viewed at 390x844 before promoting.

- profile: the person icon tile is replaced by a round avatar showing the initials "AR" (the fixture has no photo), with a Change photo button and the hint "JPEG, PNG or WebP, up to 5 MB." under it. Remove photo is hidden because there is no photo. The rest of the page is unchanged; Log out now sits partly below the 844 px fold of the scrolling list.

login and register candidates were byte-identical and were not touched. Only `profile.png` and its line in `SHA256SUMS.txt` changed. This render does not verify a physical device, the gallery picker or a real upload.


## Reviewed change: remaining signed-in report logo, 29 October 2026

A fresh current-source Chrome render revealed that ReportFlowPage still drew Icons.add even though ProductMark had been updated. Replaced only that leading placeholder with the existing approved I-Report ProductMark, preserving its ratio and allowing a single-line title to ellipsize at narrow/large-text widths. Three header regression tests failed on the previous implementation and pass at320/390px and200% text.

Reviewed all four candidate images visually before promotion: report-type, report-location, report-details and report-review. Pixel differences are confined to the top header (y14–54); all body pixels remain unchanged. The type candidate initially decoded the asset after its first capture, so the harness now precaches the report logo and pumps one settling frame. Candidates rendered outside the reference directory using GOLDEN_REVIEW_DIR=/private/tmp/ireport-update18-golden-final. No other reference changed. No physical-device, provider or screen-reader claim is made.


## Reviewed change: optional photos on the responder Operation update form, 29 October 2026

Responders can attach up to five photos to an update, and the photos are optional. The Operation update form gains a "Photos (optional, up to 5)" section with Take photo and Choose existing photos between the note and Save update. I viewed the new render before promoting it. Only `response-update.png` and its line in `SHA256SUMS.txt` changed. No physical-device, gallery-picker or real-upload claim is made.
