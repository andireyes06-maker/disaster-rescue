# Independent milestone 2 audit

For Airen · October 17, 2026. Fresh review of `http://localhost:5174`. No application code edited. Claude's earlier test and role-redirect reports are not counted as independently verified results here.

## Independently verified

- Captured login, registration and signed-out Forbidden at 1440, 1024, 768 and 390px. No horizontal overflow or recorded JavaScript page errors in these captures. Dimensions and raw results are in `evidence.json`.
- Inspected desktop login, 1024px registration, phone registration with errors, and phone signed-out Forbidden screenshots directly.
- Login names both residents and staff. Both auth pages use the same form/explanation arrangement, with the form first on phones.
- Mobile registration's first input moved from approximately y=632px in the old review to y=234px in this capture. The promotional panel follows the form, and the numbered list is visible in the inspected captures.
- Empty login submission focuses Email and marks Email and Password invalid with associated error descriptions.
- Empty registration submission focuses Name and exposes associated inline errors for Name, Email, Phone and Password. It no longer displays the old general validation banner. Confirm password does not receive an empty-state error when both password values are empty; the password error still prevents submission.
- Each of the three pages was reloaded with reduced motion enabled; the media query matched and no active browser animations were detected. This is a focused observation, not a full motion/accessibility certification.

## Remaining findings and risks

### 1. Successful registration and recovery require end-to-end verification

Source: `web/src/features/resident/ResidentSignUp.tsx`, `web/src/auth/AuthProvider.tsx`, `web/src/api/client.ts`.

Registration first creates a Firebase account, then calls `/users/self`, refreshes claims and navigates to `/my`. The auth listener independently refreshes claims and signs out users whose `active` or `role` claim is missing. A newly created account has a provisioning interval before its resident profile/claims exist. The interaction between these operations needs a real isolated-emulator registration test; existing pre-provisioned demo-account sign-in does not cover it.

The signup code also reports a generic account-creation error if the profile API fails after Firebase account creation. Retrying the complete flow can encounter an already-existing email, without an explicit resume-provisioning path in this component. This is a source-supported recovery risk, not a browser-reproduced failure in this audit.

Verify: unique fresh emulator account → complete resident setup → `/my` → reload; delayed profile response; failed profile response after identity creation; retry with the same email; confirm no duplicate profile and no permanently stranded account. Keep production untouched and clean up only the test fixtures created by that test. Preserve fail-closed authorization while making provisioning recoverable.

### 2. The no-role Forbidden explanation is not proven reachable

Source: `web/src/pages/Forbidden.tsx` versus `web/src/auth/AuthProvider.tsx`.

Forbidden contains a `user && !role` explanation, but the current auth provider signs out an account with no role instead of exposing that state as a signed-in user. Creating a genuinely role-less emulator account alone may therefore exercise the provider's sign-out behavior rather than this page branch. Define the intended behavior and test it through the real provider. Do not relax authorization merely to render a screenshot, and do not count a mocked component render as a full authenticated journey.

### 3. Sign-in validation only handles missing values locally

Source: `web/src/features/auth/LoginPage.tsx`.

The form has `noValidate`; its submit handler checks only that Email and Password are nonempty. A malformed but nonempty email reaches authentication and becomes a general credential failure rather than an associated email-format error. Validate the email format locally and focus Email, while retaining server-side authentication as the authority. This was confirmed by source inspection; no malformed credential request was submitted in this audit.

### 4. Small usability details remain

- Auth inputs still lack meaningful `name` attributes, and email inputs do not disable spellcheck.
- Form links such as “Create a resident account” have weak visual distinction from surrounding text in the inspected login capture. Give inline links a consistent underline or another persistent non-color cue, plus visible keyboard focus.
- Busy labels still use three periods. Standardize loading feedback and verify actual pending/failed requests rather than only empty submissions.
- The purple explanatory panels contain substantial repeated introductory/safety copy. The form-first order is a material improvement; further copy reduction can improve scanability without blocking work on the remaining product surfaces.

## Not independently verified

Role redirects, session restoration, duplicate-email behavior against a running emulator, signed-in/no-role Forbidden behavior, successful registration, API-stall recovery, the reported 257-test suite, authenticated resident/staff/admin screens and native Flutter. No accounts were created or credentials entered during these captures.

## Direction for Claude

Continue M3 without another milestone approval round. In parallel, close the fresh-registration/provisioning and no-role-state verification gaps above, and fix the email-format validation. Use isolated emulators for auth mutations. Record reported, source-inspected, browser-verified and blocked results separately. Preserve the whole-product scope; M2's improvements do not complete the resident, staff/admin or native redesign.
