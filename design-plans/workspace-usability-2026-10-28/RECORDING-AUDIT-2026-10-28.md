# I-Report: audit before recording, 28 October 2026

Purpose: one place that says what is verified, what is not, and what to check before any recording. Verified means a test or a command ran. Reported means a code reading only. Nothing here was tested on a physical phone.

## 1. Snapshot

| Item | State |
|---|---|
| Branch | `build/disaster-rescue` at `ec3fc26` (pushed) |
| Last CI runs on that branch | Three most recent runs: success (`4056521494`, `4056370217`, `4056088166`) |
| Web (Vercel) and API (Render) | Auto-deploy from the push. Deploy status not checked by me. |
| Phone build | `I-Report-2026-10-28-update14.apk` (SHA-256 `d344cb38…16d7c`). Debug build, production API and Firebase values. Not tested on a phone. |
| Phone shortcut | `1-APK-for-phones.apk` points to update14 |
| Uncommitted work | None in tracked files. 13 untracked folders from other sessions (promo, videos, evidence, build output). Leave them out of any commit. |

## 2. Automated checks (latest local runs)

| Suite | Result |
|---|---|
| API (Vitest) | 588 passing, 36 skipped |
| Web (Vitest) and typecheck | 546 passing; typecheck clean |
| Flutter (`flutter test`) | 272 passing |
| Flutter (`flutter analyze`) | No issues |
| API production audit | No advisories (Zod moved to v4; body-parser patched) |

Test counts are not proof of correctness. Known gaps are listed in section 5.

## 3. What changed this session

**Phone**
- Responder team tab no longer crashes when you switch tabs and back.
- Photos are downscaled at pick time (2048 px, 85%) so normal camera photos fit the 5 MB limit.
- Residents with location off can pin a place on the map.
- Pins outside the Philippines are refused (GPS and map).
- Drafts keep their town; Continue draft keeps prefilled name and phone.
- A blocked submit after an uncertain send says why.
- Profile load errors show Try again.
- Idle sign-out counts touches on pushed pages.
- Password change: any failure reaches the dialog.
- Change password (signed in) and the unread dot were added earlier and remain in place.

**Website**
- Audit log shows readable values: place names for headquarters, short labels for unknown IDs, team names, formatted times.
- Reports by location: stored town is grouped; older reports without one show as "Place not recorded" (see section 5).
- Headquarters pins outside the Philippines are refused.
- "Other" team type requires a label on create and edit.
- Move-team confirmation uses the shared dialog (focus stays inside, Escape closes it).
- Responder forms say "Nothing was sent" when location is unavailable.
- Cancelled and search views load more and retry the right list. The Cancelled count shows a dash while loading.
- A failed refresh of the password-help list keeps the rows already shown.

**API**
- Pins only inside the Philippines for report locations and team headquarters. Approximate box; Sabah excluded; Turtle Islands accepted.
- Unsafe IDs return 404 on every `:id` and `:token` route.
- Help-request reset writes its audit row before closing, so a failed write is retried safely. Closing writes its audit before the close.
- Device token takeover: a phone signed in to a new account moves its push token. The takeover is audited (token stored only as a short hash) and the previous account gets a notice.
- Public incident map: most recent 2,000 public incidents, filtered by public status first.
- Verify can be finished by a retry after a partial failure.
- Team type "Other" needs its label on create.

## 4. Decisions still open

1. **Device takeover (accepted risk).** Anyone who holds a phone's token can claim its pushes. Mitigations in place: audit row and notice. Not done: proof-of-possession challenge. Owner chose takeover; the challenge is a separate phone and API change.
2. **Locality backfill.** Not run. Needs a production service account from you. Until then, older reports show "Place not recorded" on the location chart. This is expected.
3. **Public map cap.** The map shows the 2,000 most recent public incidents. Older ones are not shown. Confirm this is acceptable.
4. **Website bell** marks every listed item read when the panel opens. The phone marks only the item tapped. The PDF asked for the phone behaviour. Confirm which one you want.
5. **No-GPS pins** are accepted without the 500 m check, because there is no reference point. The server does not check distance for manual pins either. Confirm.
6. **Password reset to email** is the owner's accepted risk. A security review has not been done.

## 5. Known gaps (not fixed)

- Phone: a notification page may leave a Firestore listener open after it closes. Not verified.
- Phone: a race in the responder team stream if the tab is disposed and shown again very quickly. Not verified.
- Phone: clearing a draft does not reset the locality. Harmless today.
- Device takeover: two phones racing for one token could record the wrong previous owner.
- Phone: whether screen-reader taps count as touches for the idle timer is not verified.
- Image resizing for small PNG files is not verified.
- Cagayan de Tawi-Tawi coordinates are unconfirmed. The Philippines check may reject a point there if it lies outside the box.
- Short-email password case: mapped to 400, but no test raises Firebase's error code.
- Firestore index: the public query relies on the existing `reports (status, createdAt)` index. Not verified against the production project.
- Golden images: two sums in `mobile/test/goldens/SHA256SUMS.txt` were updated after viewing. Full history in `PROVENANCE.md`.

## 6. Before you record: checklist

Use a test account, not a real person's account. Do not record real reports, real names, phone numbers or real addresses.

**Website (admin and responder)**
- [ ] Log in as admin; open the audit log and check that headquarters changes read as place names, and that no raw JSON or long IDs appear.
- [ ] Open Analytics; expect "Place not recorded" for older reports. Say so on camera if it shows.
- [ ] Teams: create a team with type Other without a label (should refuse), then with a label.
- [ ] Teams: set a headquarters on the map inside the Philippines; try a point outside it (should refuse).
- [ ] Users: move an account to another team; check the confirmation dialog, Escape, and focus.
- [ ] Reports queue: open Cancelled; check the count, Load more, and Try again.
- [ ] Password help: check that the list stays visible if the network drops for one refresh.

**Phone (update14, on a real device, not an emulator)**
- [ ] Install update14 (`1-APK-for-phones.apk`). Confirm the version and sign-in work.
- [ ] Resident: report with a photo larger than 5 MB; the photo should be accepted.
- [ ] Resident: turn location off, open the report flow, and pin on the map. The reach note should say the limit cannot be checked.
- [ ] Resident: try a map pin outside the Philippines (should refuse).
- [ ] Resident: profile, Change password (wrong current password, then a correct change).
- [ ] Resident: notifications bell shows the dot when there is an unread notification; opening one clears it.
- [ ] Responder: Assigned tab; switch to another tab and back (no crash).
- [ ] Responder: operation update and acknowledge with location on.
- [ ] Sign out, then sign in as a second account on the same phone; the first account should stop receiving pushes.

**Public map**
- [ ] Public page loads without signing in and shows only public incidents, with no names, phones or photos.

## 7. Recommended order before recording

1. Push and confirm the deploys (web, API) are live on the production URLs.
2. Install update14 on a physical phone and run the phone checklist.
3. Decide open items 1 to 6 in section 4. Items 2 and 4 change what the audience sees.
4. Run the website checklist on the live site with a test account.
5. Record only what the checklist passed. Note anything that failed rather than editing it out.
