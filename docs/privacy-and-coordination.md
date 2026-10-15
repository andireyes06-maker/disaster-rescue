# Privacy and coordination notes

Status: PROTOTYPE. This text was written by the project team, not by a lawyer. It has NOT been reviewed by legal counsel. The group must get real legal review before any real use with real residents.

## 1. Privacy notice text (as shown in the app)

The app shows these strings. Source: `mobile/lib/features/auth/auth_widgets.dart:6-10`.

- Registration consent (checkbox on the register screen): "We use your name, phone number and location only to coordinate rescue. See the privacy notice."
- Disclaimer (login, register and report screens): "Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline."

The "privacy notice" link points to this section. Legal review must confirm or replace the wording above.

## 2. What data is collected

| Data | Collected when | Source |
|---|---|---|
| Name and email | Registration | Firebase Auth account |
| Phone number | Optional, on a report | Report form (`contactPhone`) |
| Contact name | Optional, on a report | Report form (`contactName`) |
| Exact location (lat, lng) | Every report | Report form (GPS or pin) |
| Coarse location | Derived from exact location on every report | Server, rounded to about 0.005 degrees (`api/src/domain/privacy.js`) |
| Address text | Optional | Report form |
| Photos | Optional, up to the upload limit | Stored in Cloudinary |
| Device push token | When notifications are enabled | `devices` collection (server only) |
| Audit log | Every staff action | `auditLogs` collection (staff read only) |

## 3. Who can see what

Enforced in two places: Firestore rules (`firebase/firestore.rules`) and the API projection (`api/src/domain/privacy.js`).

| Viewer | Exact location and contact | Coarse location and status |
|---|---|---|
| Dispatcher and DMO | Yes, all reports | Yes |
| Assigned responder (their team only) | Yes, only reports assigned to their team | Yes |
| Reporter (resident) | Yes, their own reports only | Yes |
| Other residents, responders, the public | No | Yes, only for public statuses (Verified, Awaiting Assignment, Team Assigned, Rescue in Progress, Resolved). Public fields: id, type, status, priority, coarse location, created time |

Clients never write to Firestore. Only the API (Admin SDK) writes.

## 4. Retention

Current state: the code has NO automatic deletion. Reports, photos, updates, notifications and audit logs are kept until someone deletes them by hand. A retention period (for example, how long closed reports are kept) must be decided by the group and then built. Until then, do not promise residents a deletion date.

## 5. Data Privacy Act of 2012 (Republic Act 10173, Philippines)

Points the group must check with a lawyer or the National Privacy Commission guidance:

- Lawful basis and consent wording: the consent checkbox is a placeholder. Real consent text needs legal review.
- Personal information controller: someone must be named as responsible for the data. Not decided yet.
- Data subject rights (access, correction, deletion, objection): no self-service flow exists. Requests would have to be handled by hand.
- Security: HTTPS only, Firebase rules, role checks, rate limits, no stack traces in responses, and the backup plan in `docs/backup-and-recovery.md`.
- Breach handling: no breach procedure exists yet.
- Cross-border processing: Firebase and Cloudinary may store data outside the Philippines. Check the providers' data location and terms.

## 6. LDRRMO and hotline coordination

- The app shows emergency hotlines from `config/hotlines`. The seed value for LDRRMO is a placeholder (`000-0000`). Replace it with the real local number before any use. Dispatchers can edit it through the API.
- The app does not contact LDRRMO or any emergency service automatically. Residents must still call the hotline if in danger.
- Sharing exact location with LDRRMO or the DMO is a policy decision for the local office, not a technical default. Confirm with them which fields they may receive and how they will store them.
- No real LDRRMO integration exists (SMS gateway and direct feeds are out of scope).

## 7. Open items before real use

1. Real legal review of all text in section 1 and section 5. (Not done.)
2. Name the data controller and a contact for privacy requests. (Not done.)
3. Decide the retention period and build deletion. (Not done.)
4. Replace the placeholder hotline numbers and confirm sharing rules with LDRRMO. (Not done.)
5. Test the live Firebase rules on the real project. Emulator tests cover the rules only. (NOT RUN against the real project.)
