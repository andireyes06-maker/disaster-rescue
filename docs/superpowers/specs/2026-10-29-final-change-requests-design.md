# Final change requests (2026-10-29)

**Status:** draft for Airen's approval. No code written.
**Size:** big. Airen confirmed: spec, review against code, plan, then build.
**Branch:** `feat/ui-response-workspace-2026-10-28` at `9313c72` when this was written.
**Source of requests:** the translated change list from `LAST CHANGE NA(ATA).docx` (ids W1 to W5, M1, B1 below).

## Intent

Seven last changes before submission and recording. Airen wants the website, phone and data to look and behave correctly for the final demo. Several requests are partly built already, so most of this is repair and alignment; only profile photos are a new feature.

## Goals

- **B1** Every role can have a profile photo, and others can see it.
- **W1** "Reports by location" groups by the town or city of the report's map pin.
- **W2, W5** The website sign-in page is refined and gains "Forgot password?" and "Contact an admin to reset it".
- **W3** "Medical" is a team identity choice.
- **W4** An administrator opens the submitting account's profile from the incident.
- **M1** The phone shows the real I-Report logo instead of the plus mark.

## Non-goals and anti-goals

- No new roles, no new native staff workspaces, no resident web reporting.
- No rename of the Lifeline emergency type. Medical is a team identity only.
- No one-time repair of the existing "Place not recorded" reports. Airen will clear the disaster reports and have fresh ones created.
- No password, reset token or auth secret is ever shown or returned by any new endpoint.
- No invented contact address for "Contact an admin".
- No redrawn or newly invented logo.
- Anti-goal: a sign-in page that looks better but loses required markers, inline errors, password visibility, busy state or keyboard focus.
- Anti-goal: a profile photo that anyone on the internet can fetch without signing in.

## Decisions Airen made (do not reopen)

1. Every role gets a profile photo, on each platform it already uses (resident and responder on the phone; administrator and responder on the website).
2. Others can see a user's profile photo, for example a resident seeing their assigned responder.
3. "Contact an admin" reuses what exists (Airen: "you decide, use what's already there").
4. No backfill of old reports. Existing disaster reports will be cleared and proper ones created later.
5. Medical is added as a team identity; Lifeline stays the incident label.
6. Admin profile viewer shows the account that submitted the report, not necessarily the report's contact person.

## Calls I made (Airen to check)

- **Photo rules:** reuse the report-photo rules: 5 MB limit and the existing image-type sniffing, stored in the same private Cloudinary delivery. Replace swaps the photo and removes the old asset after the new one is saved. A "Remove photo" action returns to the default avatar. A failed or cancelled upload keeps the current photo. Only the account owner can change their own photo.
- **Who sees a photo:** any signed-in active user, wherever that person's name is already shown to them (assigned responder on a resident's report, resident on responder and admin views, team members). Never to signed-out visitors. The Firestore `users` document stays readable only by the owner and administrators (`firestore.rules:43`), so the photo reaches other users through the API or through the records that already show the name. The builder chooses which.
- **Contact an admin on the web** posts the same request to `/auth/reset-help` that the phone posts, and the existing website password-help panel lists it. Administrator passwords cannot be reset from that panel (existing rule), so administrators use "Forgot password?" (emailed link).
- **Location grouping:** town or city, not the full street address.
- **Server fallback:** a new report always gets a town or city. If the phone sends none, the server looks it up from the pin. If the lookup fails, the report keeps the honest "Place not recorded" fallback; it is never guessed.
- **Grouping key source (builder check):** the town comes from the phone's town field when present; otherwise from the server lookup. The lookup's town is the city, town or municipality only. County, province and state are never used as a town, because that would merge different towns under one label (`placeService.js:29` currently falls back to them; change that for the grouping key). Road and district stay out of the key.
- **Photo delivery (builder check):** the stored value is the Cloudinary public id, not a signed URL. A fresh signed URL is made each time a photo is read through the API, so links never go stale and nothing stores an expiring URL.
- **Live, not snapshot (builder check):** photos always show the current photo. Reports, teams and other records do not copy the photo; they point at the account and the photo is read when shown. Changing or removing a photo therefore needs no updates to other records.
- **Admin profile viewer:** a read-only dialog with display name, photo, email, phone, role and account status, where present. Focus returns to the opener on close. A missing or deleted account shows a clear "profile unavailable" state.

## Requirements by item

### W1. Reports by location
Found in code: the town is an optional field on a report (`api/src/domain/validation.js:68`), stored only when sent (`reportService.js:61`), and analytics groups by that stored value (`statsService.js:52`, fallback `Place not recorded` at `:54`). The lookup service joins road, district and city into one string (`placeService.js:29`), so a looked-up name may not equal the town the phone sends. The root cause of the 22 unrecorded reports is **not yet confirmed**; investigate before fixing (a guess: old or seeded reports have no stored town).
- Make one documented rule for what counts as the grouping key, applied to new reports and any stored older ones, with the unknown-location fallback.
- Chart, table, report list and active filters agree on counts.
- Acceptance: a controlled report pinned in Guiguinto appears under Guiguinto in chart and table; a report with no usable locality still shows the fallback.

### W2 and W5. Website sign-in
- Refine hierarchy, spacing, alignment and the sign-in and explanatory panels. Keep the purple and harbor identity and the real logo (`web/public/brand/ireport-logo-*.png`).
- Add "Forgot password?" with email validation, neutral wording that does not reveal whether an account exists, and no repeat requests while one is pending. Reuse the Firebase reset email the phone uses.
- Add "Contact an admin to reset it" per the call above, with the phone's wording and the same "enter your email first" guard.
- Copy states which roles use the website (administrator, responder) and which use the phone.
- Keep the existing tests in `LoginPage.test.tsx` and `LoginPage.websiteAccess.test.tsx` passing or update them with reason. Note `LoginPage.tsx`, its test and `public.css` already have uncommitted edits from an earlier session; read them before changing.
- Acceptance: empty and malformed email messages; neutral result; busy, invalid and failed states usable; no horizontal overflow at 390 and 1440 px.

### W3. Medical team identity
- Add `Medical` to `TEAM_KINDS` (`api/src/routes/teams.js:11`), its error message, the create and edit selects in `TeamsPage.tsx`, and every place a team identity is shown. The assignment dialog keeps its own list, `IDENTITIES` in `web/src/features/reports/AssignTeamDialog.tsx:56`, and shows any unknown identity as Rescue, so it must change too (found in the builder check). Search for other hard-coded copies.
- Acceptance: create a Medical team, reload, identity persists, team appears in lists and assignment choices.

### W4. Admin opens submitter's profile
- The report stores the submitting account as `reporterId` (`reportService.js:54`). The incident currently shows a "Contact person" (`IncidentDetails.tsx:299`). Link by `reporterId`, never by display name.
- Needs a new administrator-only read of one user (the current routes in `users.js` have list and patch but no single read). Returns no secrets.
- Acceptance: correct person when the contact person differs; non-admins get 403; guessed ids give no data; focus returns on close.

### M1. Mobile logo
- The plus mark is drawn in `mobile/lib/theme/product_navigation.dart:110`. The phone ships only `mobile/assets/brand/app-icon.svg` and the pubspec lists fonts only, so the approved logo asset must be added to the app. Check every header that uses this widget so the change is coherent.
- Do not draw a new mark. Use the approved I-Report logo, with the light or dark variant that suits the header.
- Acceptance: welcome, sign-in and signed-in report headers show the logo, sharp and aligned at narrow widths. Golden images change here; view them before regenerating (existing rule).

### B1. Profile photos
- Phone already has a profile page (`mobile/lib/features/profile/profile_page.dart`). The website had no profile page in the feature list I checked; the builder confirms and adds a small one, or a dialog from the account menu in `AppShell.tsx`.
- Add a photo field on the user record, an owner-only upload and removal endpoint, validation and a default avatar fallback. Show the photo wherever an avatar or initials mark is drawn today (for example `identity-mark` in `TeamsPage.tsx`, `AppShell.tsx`, incident views).
- Acceptance: upload, reload and see it on another client of the same account; cancelled or failed upload keeps the old photo; oversized or unsupported files are refused with a plain message; changing a request id cannot change another account's photo; a missing or broken photo falls back to initials.

## Constraints

- Production writes (deleting the old reports, seeding new ones), Firebase deploys, rules changes and any push to `build/disaster-rescue` need Airen's explicit approval each time. A push deploys live web and API.
- Firestore rules: a photo field needs no new write rule (all writes go through the API, `allow write: if false`). A rules change is needed only if the builder lets clients read other users' documents; avoid that.
- No Android emulators. The phone cannot be verified on a physical device here; say so.
- Opus is the highest model for any subagent or reviewer, never Fable.
- Do not stage `docs/documentation/handoff.md` (another session's edits). Do not revert the Zod 4 migration.
- Never print or commit keys.
- No em dashes in user-facing text.

## Left to the builder

- Where each piece lives in the API and data model (photo field name, how photos reach other users).
- The sign-in page's exact visual design within the constraints above.
- Whether the website profile is a page or a dialog.
- The order of work. Suggested: W1, W3, W2 with W5, M1, B1, W4, then verification.

## Verification

- API: `npm test`. Web: typecheck, `npm test --maxWorkers=2`, `npm run build`. Flutter: `flutter analyze` and `flutter test`. Run separately.
- Local browser checks of sign-in, teams, analytics and the incident at 390 and 1440 px on the local emulators.
- Rebuild the APK (mobile changes) and refresh the affected pack files, checksums and the source ZIP, only after Airen approves.
- State plainly what was not checked: physical Android or iOS, real push, screen-reader behaviour, and any live-provider check not performed.
- Whole-branch Opus review must pass before the push; the earlier attempt on `54080d9..9313c72` is still not passed.

## Open questions

None blocking. If Airen disagrees with any "Calls I made", change it before the plan.
