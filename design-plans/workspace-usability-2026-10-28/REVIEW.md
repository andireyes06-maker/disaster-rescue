# I-Report workspace usability review

October 28, 2026. Working source: `/Users/rien/Documents/FINAL_PROJECT/app`, based on `692ea0d`. Original pre-release review follows. This pass was subsequently committed, pushed and deployed; see [RELEASE-2026-10-28.md](RELEASE-2026-10-28.md) for current production identity and CI limitations.

## Review locally

Use **http://localhost:5417/**. It runs the current web source with a dedicated API on3417, against the owned `demo-disaster-rescue` emulators (Auth9407 / Firestore8407). The older5407 preview uses the older API and is not the current lookup verification target.

Fictional emulator-only administrator: `elena.cruz@harbor.example`, password `Demo-Sample#2026`. These are not production credentials.

## Owner feedback addressed

- **Users:** aligned account/status/team/access columns, explicit membership placeholders, readable activity status and consistent controls. Email wrapping is replaced by truncation with the full value retained in the DOM and title. Missing email displays a human-readable state instead of a Firebase UID.
- **Header/profile:** header contains the profile trigger then notifications. Sign out sits at the sidebar bottom (inside the expanded Menu on phones). Change password is inside the profile, using the existing Firebase reauthentication/change logic. No auth-provider, role or session policy was changed.
- **Admin hierarchy:** four task destinations lead into separate People and access / Service operations groups. Section headings, icon blocks and compact control groups replace the flat, oversized rows.
- **Teams:** creation is a focused dialog; the list stays underneath. Headquarters editing is also in a dialog. Maps measure themselves after opening/resizing and recenter on the chosen point. A selected pin resolves its approximate place name. Save errors stay visible inside the headquarters dialog. Inputs and pin changes are guarded while creation is saving.
- **Incident facts:** the known disaster type is shown as Incident type. Empty optional classification is not presented as a missing required field; a saved custom classification still displays and can be edited. Resident landmark, pinned place, contact person and contact number are separate fields. Phone numbers retain their tel links. No operational data was invented or backfilled.
- **Incident length:** Report and location / Response and updates tabs separate the two tasks. The modal is bounded to the viewport with a persistent close header. History keeps the existing five-row disclosure and twenty-row loading window, inside a keyboard-focusable scroll area capped at380px. A long history no longer lengthens the page without bound.
- **Maps:** the same fixed disaster symbol appears in pins and its legend; priority colors AND shapes match the priority legend. The explanation identifies which visual encodes which meaning. Clicking a map point shows an over-map place inspector and exact coordinates, with a Google Maps link. Existing report positions are never edited by inspecting the map.
- **Failure states:** map-background errors show Retry map background while retaining the pin. An unavailable place lookup keeps the coordinates and explicitly says the address is unavailable.

## Lookup architecture and limits

New authenticated, read-only endpoint: `GET /api/places/reverse?lat=...&lng=...`, restricted to current active administrators/responders through the existing canonical-profile middleware. Coordinates are validated and rounded to roughly110m before external lookup; exact pins remain separate. No contact names, phone numbers or report text are sent to the provider.

The current API's single-process deployment uses one serialized queue, at least1.1 seconds between upstream request starts, five-second provider deadline, eight pending distinct points, duplicate coalescing and a bounded512-entry cache. Successful labels cache for one day; unavailable labels for one minute. The endpoint can be switched through `GEOCODER_REVERSE_URL` to a Nominatim-compatible provider.

The [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) limits aggregate application traffic, requires identification/attribution, and prohibits autocomplete and systematic extraction. This implementation resolves selected points, not every point while panning or every report in a list. Current native direct lookups were not changed in this web pass; aggregate traffic and a shared limiter/owned provider must be considered before scaling or migrating all clients. Multiple API instances would require a shared queue/cache or a provider plan covering that traffic.

Place labels are approximate provider results, not verified incident addresses. A real local lookup returned streets/districts; one lookup returned no label and correctly kept its pin. Hosted provider reachability has not been tested. Deploy the API endpoint together with the web changes; publishing only the web would show coordinate fallbacks until the endpoint exists.

## Verification on this source

- Full web: **516 passing across71 files**. Typecheck and production build pass. Existing Vite large-chunk advisory remains.
- Full API: **548 passing;36 skipped**, across63 passing and9 skipped files. Provider/endpoint regressions use fake provider replies; no public-service flooding in tests.
- Chromium at1440 and390: Users, Teams, Admin, incident details, incident response, map/selected location, create-team dialog and profile. No page exceptions or horizontal overflow in these runs. Real local-API place replies and explicit no-address fallback were observed.
- Tile failure injected as HTTP503: notice appears; Retry reloads real background tiles (HTTP200), retains the HQ marker and the exact selected coordinates. Existing-team location editor was also rendered at390.
-45 synthetic updates on local report `ui-layout-history-check`: newest5 first, expand20, fetch40 then45; scroll area stays380px with10,147px of content. Modal stays868px tall at1440×900 and884px at390×900. Close stays within the viewport; history accepts keyboard focus; Escape returns focus to the map marker.
- Nested Assign team Escape: parent incident remains, child closes, focus returns to Assign team at both widths. A forced never-ending CSS exit reproduced the original failure; top-layer Escape handling plus a300ms cleanup cap leaves the parent accessible. Normal140ms closing motion is retained. Reopen cancels the cleanup timer. Two regressions simulate a missing presence-layer exit event.
- Local fixture mutation only: one clearly named layout-check report and45 updates were seeded directly into the owned emulator for long-content verification. No real account, report or team was changed.

## Scope and remaining verification

This is a targeted web usability pass, not a new full release/security audit. No rules/indexes/native/dependency changes. No commit, push or deployment. Firefox/WebKit, screen readers, physical devices and hosted reverse lookup were not rerun. The existing undici advisory from the prior deployment is not resolved by this work.

Normal motion was used during browser checks. Existing accessibility motion preferences remain intact. Existing queue ordering, roles, report mutation requests and permission rules are preserved.

Evidence and capture scripts are in `evidence/`; `CHANGED-SOURCE.json` records the source hashes. Initial intermediate failures/captures are not final approval evidence; use the final suite, interaction and tile-retry records. No visual regression goldens were approved.

## Continuation pass, 28 October 2026 (uncommitted)

Base: `cd087ca` (production). All changes below are uncommitted in the working tree, for owner review. Nothing was pushed, deployed, or written to production. File hashes are in [CONTINUATION-SOURCE.json](CONTINUATION-SOURCE.json). Design notes and the locality backfill proposal are in [LOCALITY-BACKFILL-PROPOSAL.md](LOCALITY-BACKFILL-PROPOSAL.md).

### Changes
- **Audit log, headquarters (PDF A).** The raw coordinate object is no longer printed. A headquarters change shows the place name recorded with the same event. Without one it shows `Coordinates lat, lng` at five decimals. The stored audit event is not changed. `hqName` is folded into the headquarters row.
- **Analytics by location (PDF B).** Grouping now trims spacing and ignores case, using the stored `locality`. Reports without a stored place go to their own bucket, `Place not recorded`, so the total always equals the filtered total. The chart and table read the same data. No geocoding is done on read. Historical backfill is a proposal only and was not run.
- **Mobile change password (PDF C).** Restored as signed-in change only, above Log out. Reauthenticates with Firebase, then updates. Inline errors per field, show and hide toggles, a busy guard, a live result message, and a Done step. Minimum 8 characters, matching the registration copy. Public recovery is not restored. The profile golden matches the reviewed render from `79b2148`.
- **Unread dot (PDF D).** A bell dot for residents and responders. The dot is driven by a one-document query (`read == false`, `limit 1`) scoped to the account. The dot animates, and reduced motion makes it instant. A stream error shows no dot. The bell label says "Notifications, new" when something is unread.
- **CI fixes.** `api/package-lock.json`: body-parser 1.20.8 to 1.20.9, within the existing semver range (no `--force`). `operation_form_page.dart`: the repository is read before the await. `operation_transitions.dart`: braces added. `flutter analyze` reports no issues.

### Test results
- Web: typecheck passes. 522 tests pass (72 files), up from 516.
- API: 550 pass, 36 skipped (63 files), up from 548.
- Flutter: `flutter analyze` reports no issues. `flutter test`: 260 pass, 1 fails. The failure is `report-details.png` at 36.48%, which was already failing before this pass. It is not regenerated.
- New tests: `change_password_dialog_test.dart` (9), `notification_bell_test.dart` (4), `presentation.test.ts` (6), two in `stats.test.js`.
- Auth emulator (local, `demo-pw-verify`, port 9099): wrong current password is rejected; correct one reauthenticates; the update succeeds; the old password then fails; the new one signs in. This checks Firebase's protocol. The Dart `FirebaseAuthBackend` mapping is not covered by a test, because `flutter test` cannot reach Firebase.

### Defects found and not fixed in this pass
- `SHA256SUMS.txt` already listed hashes that do not match four committed goldens: `map-tile-free.png`, `register.png`, `report-details.png`, `report-review.png`. The images match HEAD, so the sums file is stale. Not changed.
- `report-details.png` fails at 36.48%. It needs a reviewed decision; it is not regenerated.
- API audit still fails on `zod` (GHSA-mrhx-c7xc-m3w5). The fix is a major migration from v3 to v4, deferred to its own task.
- Notifications written before the `read` field existed would not show the dot. The API has always written `read: false` on creation, so this is not expected, but it has not been checked against production data.

### Not run
- `flutter run -d chrome` and physical-device checks.
- Live browser checks of the audit and analytics pages.
- Firefox, WebKit and screen-reader checks.
- Authenticated production geocoder lookup.

### Skills
Used: superpowers:brainstorming (loaded for the spec gate). Other skills named in the continuation (frontend, accessibility, motion, security, testing) were not invoked in this pass; the tests above are the evidence.
