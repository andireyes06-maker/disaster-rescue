# Group demonstration script

Prepared 20 October 2026. Suggested duration: 8 minutes; the supplied brief sets no video duration. Assign real member names before recording. Every member must participate or explain their contribution. The silent Flutter Chrome preview is supporting footage, not the complete presentation.

## 0:00–0:45 · Purpose and technologies

Architecture presenter: introduce report-to-response coordination. Explain React/TypeScript/Vite for web, Flutter/Provider for mobile, Express for API, Firebase Auth and Firestore for identity/data, Cloudinary for photos and FCM for push. Residents/responders use mobile; staff/admin use web.

## 0:45–2:15 · Resident demonstration

Resident-flow presenter: Welcome, register/sign in, type, location, details/photos, review, submit, confirmed reference, My Reports and the bell. Explain required markers and error icons. Say that submission does not guarantee rescue and a timeout can mean receipt is uncertain. Use fictional data. If non-production photo credentials are missing, omit the live upload and say so; do not present a mock as provider evidence.

## 2:15–4:15 · Dispatch and response

Staff/field presenter: web /dashboard → incident verification/priority → team assignment. Flutter responder → assignment → acknowledge → operation update → live history. Resolve as responder, close as dispatcher, show Recently closed and /audit. Explain stable retry identities and that old notifications never grant permissions.

## 4:15–5:15 · Monitoring and admin

Web presenter: DMO /monitor and /analytics, chart tables and export; admin /admin plus permitted Teams/Users routes; show one unauthorized-route refusal. Admin is a real web workspace.

## 5:15–6:30 · Database and architecture

Show schema.md, firestore.rules and the workflow graph. Clients listen to authorized documents; operational writes pass through the API. Reports link to update history, team, reporter, notifications and audit entries. Profile and claims establish current access. Server-only submission, photo and effect ledgers support retry/recovery. Firestore is document-based, not SQL.

## 6:30–7:30 · Challenges and solutions

Each presenter explains work they actually understand:
- Lost replies: attempt keys and uncertain wording, supported by retry tests.
- Access changes: guarded profile sync, access holds and session isolation.
- Long history: bounded reads and disclosure/paging.
- UI consistency: shared theme, finite motion, bounded content and resident bell.
- Upload cleanup: durable reconciliation; distinguish fake-provider coverage from real Cloudinary verification.

Use dated current counts in the handoff, not historical counts from another source tree.

## 7:30–8:00 · Contributions and limits

Each member states their real work with file/commit/test evidence. Complete contributions.md truthfully. State remaining provider/device/signing limits. Chrome does not certify physical-device permissions, push, accessibility services, app restart or store release. Do not invent hotline/authority, policy approval or member contributions.

## Recording checklist

- [ ] All members assigned truthful speaking/contribution roles.
- [ ] Web and mobile feature recordings completed on current source.
- [ ] Database/architecture and challenges explained.
- [ ] Final combined video has speech and captions.
- [ ] No real personal data, passwords or provider secrets exposed.
- [ ] User-guide slides, source, schema and contribution report accompany submission.
