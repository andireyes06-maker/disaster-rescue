# Handoff: I-Report, 29 October 2026, final change requests

> Branch `feat/ui-response-workspace-2026-10-28` (this `app/` tree). Production branch `build/disaster-rescue`: a push deploys live web and API, so push only with Airen's explicit approval each time. Spec `docs/superpowers/specs/2026-10-29-final-change-requests-design.md`, plan `docs/superpowers/plans/2026-10-29-final-change-requests.md`, ledger `.superpowers/sdd/2026-10-29-final-change-requests/progress.md` (git-ignored, this machine; holds every `Ruling:` and deferred minor).

## Start here
- **PUSHED AND DEPLOYED 29 Oct 2026 with Airen's approval: production `build/disaster-rescue` = `19435bb` (CI web-api, firestore, flutter all passed; API health ok; `GET /api/users/me` unauthenticated returns 401, so the new API is live). Web visual not re-checked live. Commits `24ac688`..`19435bb`:** W1 town fix (route dropped `locality`; server now fills a missing town from the pin, city/town/municipality only), W3 Medical team identity, W2+W5 web sign-in with Forgot password and Contact an admin, M1 real logo on the phone, B1 profile photos (API, web dialog, phone profile page), W4 admin "View submitter profile", reporter photo on admin screens, demo seed towns.
- **Checks (separate runs):** API 653 pass 36 skipped. Web `tsc` clean, 652 pass, `npm run build` ok. Flutter analyze clean, 310 pass.
- **Not done:** (1) whole-branch Opus review `54080d9..HEAD` never completed (account limit, resets 4:40 AM Manila; the Task 9 reviewer also hit it and was redone on Sonnet). Not passed. (2) APK not rebuilt (needs Airen's yes). (3) Production reports not cleared or reseeded (Airen will clear; needs explicit approval and an exact list). Queue decision made: KEEP priority-first; docs fixed in `59936eb`. Demo pins now spread over Bulacan towns (`19435bb`). (4) Submission pack, source ZIP and checksums not refreshed. (5) Browser pass of the incident dialog, Teams and Analytics not done; sign-in and web profile photo were browser-checked on local emulators only.
- **Not verified anywhere:** physical Android/iOS, real push, screen readers, real Cloudinary signed photo URLs, real Firestore `photo: null` clear.
- **Open question for Airen:** whether a resident should see the assigned responder's photo (no such screen exists and responders never see resident names, so not built). Ask the instructor to confirm priority-first within FR-06.
- **Next:** (a) when the limit resets, run the whole-branch Opus review of `54080d9..HEAD` (dispatch with model opus, 200 words max, file:line refs); fix Critical/Important test-first. (b) Final fix wave candidates from the ledger: per-user upload rate limit on `PUT /users/me/photo`, 60 s upload timeout on the phone, AppShell photo reset on uid change, always-present status region on sign-in. (c) With Airen's approval: rebuild APK (current APK update16 predates all of this), refresh pack/checksums, clear and reseed production reports.

## Decisions Airen made (do not reopen)
Photos for every role, visible to others (admin screens only for now). Contact an admin reuses `/auth/reset-help`. Old disaster reports will be cleared and recreated, no backfill. Medical is a team identity only; Lifeline stays the incident label. Keep Opus as the top model for subagents, never Fable. Earlier: emergency type names Lifeline, Roadblock, Live Wire, typed Other.

## Gotchas
- Never run `dart format` on directories (an implementer reformatted 24 files; restored). Stage only named files. Do not stage `docs/documentation/handoff.md`.
- macOS `sed -i` needs `''`. Typecheck and tests run as separate commands. No Android emulators. Do not regenerate goldens without viewing them. Never print or commit keys.
- Production writes, Firebase deploys, rules changes need approval. Firestore rules unchanged by this work.

## Resume prompt
"Read HANDOFF.md in /Users/rien/Documents/FINAL_PROJECT/app, then continue from step (a) of Next. Tell me what you need from me."

## Pointers
Older handoffs: `docs/history.md`. Pack: `../SUBMISSION-2026-10-28-I-REPORT/`.
