# Device takeover: proof of possession (DRAFT, not approved)

Status: draft for owner review. No code changes. Implementation waits for approval.

## Problem
`POST /api/devices` (`api/src/routes/notifications.js`) moves a push token to whichever account calls it. If the token belongs to another account, the takeover is audited and the previous account gets a notice, but the move still happens. Anyone who learns a phone's push token can take its alerts. The owner accepted takeover with audit and notice, and asked for no return to the old 409 refusal without asking. This plan adds a check that the caller holds the phone, and keeps takeover allowed.

## Idea
Only the phone that holds the token can receive a push sent to that token. So the server sends a one-time challenge to the token through FCM. The takeover completes only after the phone echoes the challenge back. A caller who only knows the token never sees the challenge, so cannot finish the takeover.

## Flow
1. Phone signs in and calls `POST /api/devices` with its token.
2. If the token is unowned or already owned by the caller, register as now.
3. If the token belongs to another account:
   a. Server stores a pending claim: token hash, new uid, random nonce (at least 128 bits), expiry 5 minutes, single use.
   b. Server sends the nonce to the token as a data message through FCM (`api/src/adapters/fcmSender.js`).
   c. Server answers `202 challenge_sent`. The takeover has not happened yet.
4. Phone receives the data message and calls `POST /api/devices/confirm` with the token and nonce. The phone does this regardless of which account is signed in, because possession is the check. (Option B below asks the user on the phone first.)
5. Server checks the nonce, expiry and single use, then does the existing takeover: audit row, notice to the previous account, claim the token.
6. Wrong, expired or reused nonce: refuse with 403 and record a `device.takeover_refused` audit row.

## Decisions for the owner
- **A (automatic echo):** the app confirms on its own. Blocks anyone without the phone. Simplest.
- **B (user confirms on the phone):** the phone shows "Sign this phone in to another account?" before it confirms. Also stops a rightful phone from being taken over silently, but adds a prompt.
- Expiry window (proposed 5 minutes), and whether a pending claim blocks a second claim for the same token.

## Changes needed
- API: pending-claim storage (new collection with TTL), challenge send, confirm route, refusal audit row. Firestore rules: no client access.
- Mobile: handle the challenge data message in `mobile/lib/features/notifications/push_registration.dart`, call confirm, and show the pending state. Offline and retry behaviour must match the existing `registrationPending` flow.
- Tests: API unit tests for each refusal (wrong nonce, expired, reused, same account), race between two claims, and the notice still sent. Mobile tests for the pending state.
- Dead code: `claimDevice` never returns false, so the 409 branch is unreachable. Leave it unless the owner asks.

## Risks
- If FCM is slow or the phone is offline, the takeover waits. The owner must accept that the new account gets no pushes until the challenge is confirmed.
- A phone with no push permission cannot confirm. That is the intended refusal.
- The nonce must never be written to logs.

## Not in scope
- Changing the audit or notice behaviour already in place.
- Any production data change. The rollout is a normal deploy to `build/disaster-rescue`, which needs owner approval.
