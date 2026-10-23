# Rescue Reports user guide

Updated 23 October 2026 for the professor clarification (website for administrators only; residents and rescuers use Flutter). Earlier text: 20 October 2026. Companion: Rescue-Reports-User-Guide.pptx, generated from generate.cjs and actual local Flutter Chrome captures. Screenshots use fictional emulator accounts, not physical phones.

## Workspaces

| Role | Flutter | Web entry |
|---|---|---|
| Resident | Welcome, registration, report flow, My Reports, notifications, profile | None. /my and /register show the mobile-app notice |
| Responder | Assigned, map/detail, progress history, updates, notifications | None. /assignments shows the mobile-app notice |
| Dispatcher | None. Website sign-in is refused; functions are the administrator's | None |
| DMO | None. Website sign-in is refused; functions are the administrator's | None |
| Admin | Not applicable | /dashboard (oldest-first queue, Validate report), /monitor, /analytics, /audit, /teams, /users, /admin |

The professor clarified (23 October 2026) that the website is for administrators, and residents and responders use the Flutter app. Dispatcher and DMO accounts keep their records; their website and API access is refused.

## Resident instructions

1. On Welcome, choose Create a resident account or Sign in. Required fields have an asterisk. Errors have an icon and text.
2. For recovery, enter the email on Sign in and choose Forgot password. The neutral notice does not disclose account existence; delivery depends on the provider.
3. Report: select type, use GPS or choose a location, enter description/contact details, optionally attach photos, then review and submit.
4. Keep the confirmed reference. A timeout does not prove nothing was saved. Use the existing retry/check actions and read storage-failure notices.
5. My Reports shows active and historical reports. Open one for status/history. Cancel is offered only in the permitted Submitted state.
6. The bell opens notifications. In-app notifications still work if push registration fails. Returning preserves the report step.
7. Profile shows contact details and Log out. Load failures offer retry.

A report does not guarantee immediate rescue. Use the appropriate local emergency service when in danger. This guide does not invent a hotline or approve privacy/retention policy. Photo bytes are not retained as a local draft.

## Responder instructions

1. Sign in with an assigned responder account. Active assignments belong to the current team.
2. Open an assignment, review location and acknowledge it. Open in maps uses the device map handler when available.
3. Add operation update: choose an allowed status, enter People rescued, optionally add a note, then Save update.
4. A confirmed update appears in Progress history. Five entries initially show from the newest 20 fetched; use Show more and Load older when offered.
5. Unconfirmed payloads keep separate retry keys. A sixth distinct unresolved payload is blocked. Check history before explicitly discarding unconfirmed attempts, which removes their protection.
6. Recently closed is read-only. Notification links do not grant additional access.

Team/role changes hold protected content while profile and claims synchronize. Retry access check is offered after automatic checks. Deactivation ends the session. Offline clients cannot discover remote revocation instantly.

## Staff web instructions

- Administrator only: Dashboard /dashboard lists reports awaiting action, oldest first; priority does not change the order. Incident review /incidents/:id: Validate report (manual review, with the validator and time shown afterwards), reject with a reason, mark duplicate, priority, classification, assign team, and close. Map /map, Monitor /monitor, Analytics /analytics, Audit /audit, Teams /teams, Users /users, and Admin /admin.
- Dispatcher and DMO: no website access. Sign-in shows "Website access is for administrators only." Do not present these roles as web workspaces.
- Responder and resident: Flutter only. Old web paths show the mobile-app notice.

## Presentation and evidence

Use fictional accounts and current deployment addresses from the handoff. Do not put passwords or service keys in slides. See ../video-script.md for the full group demo and ../contributions.md for real member contributions.

This finish pass checked welcome/sign-in, resident bell/profile/location, responder acknowledgement, a real local-emulator operation save and its live history, plus desktop notifications. Widget tests cover true 200% text scaling. Earlier broader flows remain dated evidence in the release ledger, not newly rerun claims. Phone permissions, native restart, push delivery, signed releases, VoiceOver and TalkBack remain unverified.

Regenerate: PPTXGENJS_PATH=/path/to/node_modules/pptxgenjs node docs/user-guide/generate.cjs. Review final rendering in PowerPoint/LibreOffice; those applications are absent here.
