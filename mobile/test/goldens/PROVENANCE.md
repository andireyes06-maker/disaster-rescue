# Golden references (Flutter native visual tests)

Status: **legacy reference set, not approval of the current mobile design.** These images were captured earlier by the Codex
native review and are tracked here so the golden tests run from a clean checkout. The tests passing against them confirms
that the current screens still match these references. It does not certify that the current design is the approved design.
Changing a reference requires a reviewed visual decision, recorded here, and must not be done merely to make a regression pass.

## Origin

- Source folder (untracked, original project): `/Users/rien/Documents/FINAL_PROJECT/design-plans/codex-redesign/native/`
- Captured: 17 October 2026, 11:44 to 11:45 (file times). The Codex native review log for this set is
  `design-plans/codex-redesign/checks/codex-native-captures.log`, which records a passing run of the visual suite with these files.
- Generation command: **not recorded** in the source log. Do not treat any command here as the original generator.
- Copied unmodified into `mobile/test/goldens/` on 18 October 2026. Checksums: `SHA256SUMS.txt` (SHA-256 of each PNG).

## Test setup these references assume

- Test file: `mobile/test/redesign_visual_test.dart`. Each capture uses a 390 by 844 logical viewport at device pixel ratio 1.
- Flutter 3.44.8 (stable), Dart as bundled, macOS arm64 test host. Fonts: the app's bundled Geist font assets.
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
