# Technical walkthrough narration

Synthetic voice: macOS Samantha, 155 words/minute. Fictional local data. Scene timings and captions are approximate phrase boundaries, not human speech alignment. Members must still confirm their contribution and participate or explain their work.

## 0.00 min · Rescue Reports

Welcome to Rescue Reports, a web and mobile system for reporting emergencies and coordinating a response. This presentation uses clearly disclosed synthetic narration. All accounts, incidents, locations and rescued-person counts shown in the local demonstration are fictional. The recording explains the system and its tested behavior; it does not represent an official emergency service. The members must still confirm their own contributions and be ready to explain their work.

## 0.48 min · Architecture and roles

The website uses React, TypeScript and Vite. The mobile application uses Flutter with Provider. An Express API handles operational changes. Firebase Authentication identifies the caller, and Firestore stores reports, teams, updates, notifications and audit records. Clients receive authorized live reads, while operational writes go through the API. Cloudinary and Firebase Cloud Messaging are integrations for photos and push. Their real delivery is a separate verification gate. Residents and responders use Flutter; dispatchers, monitoring officers and administrators have web workspaces.

## 1.12 min · Resident: submit a report

The resident signs in and describes a flood report, enters a location, and submits it. In this recorded rehearsal, the form returned a confirmed report reference and opened its detail page. Required entries have visible markers, and errors use both an icon and readable text. A submitted report enters the review queue. Submission does not promise an immediate rescue. If a reply is lost, the user should follow the uncertain-outcome guidance, because a missing reply does not prove the server failed to save the report.

## 1.63 min · Dispatcher: verify and assign

The dispatcher reviews the report before assigning a team. In the rehearsal, the dispatcher verified the incident, then assigned Team Alpha. The system checks the current role and permitted workflow transition at the server. An assignment connects the report and team rather than relying on a notification for access. The resident then receives the changed status. This sequence was performed through the real local user interfaces and checked through the local API, using isolated emulator data.

## 2.11 min · Responder: acknowledge and update

The assigned responder opens the incident, acknowledges it, and posts an operation update. In this demonstration, the responder recorded two fictional people rescued and a progress note. The new entry appeared in progress history. History reads are bounded, with the newest twenty fetched first, five initially visible, and controls to reveal or load older entries. The resident page received the update without a reload. A response is only reported as saved after confirmation; uncertain attempts keep their retry identities.

## 2.63 min · Closure and read-only history

The responder marked the operation resolved, and the dispatcher closed the report. A final API read confirmed the Closed state. Recently closed reports remain available to the assigned team as read-only records. The closed detail has history controls but no operational actions. An old notification cannot grant access to a report. The rehearsal also checked the resident view after closure. This separates completion of field work from the dispatcher closure step and preserves a traceable history.

## 3.12 min · Monitoring and analytics

The monitoring officer can inspect current incidents and aggregate information in the Monitor and Analytics workspaces. These are read-only operational views for that role. The rehearsal loaded both pages with the current fictional data. Charts also have accessible tables, and analytics exports are handled through the server. Permission checks apply to the export as well as the page. This footage demonstrates rendering and access in the local stack; it is not a claim that every possible analytics dataset has been independently validated.

## 3.63 min · Administration

The administrator has account and team management workspaces. The rehearsal rendered the accounts and teams pages after the incident workflow. Account activation, role and team changes affect both authorization and the client session. A profile change holds protected content while claims catch up. Deactivation ends access. Administrators do not use notifications as permission tokens. Changes that affect staff permissions are checked at the API and within the relevant transaction.

## 4.12 min · Flutter resident and responder experience

Flutter provides its own welcome, sign-in, registration and recovery screens, the resident report flow and report list, notifications and profile, plus responder assignments, incident details, progress history and operation updates. The redesigned interface uses a light workspace, a dark harbor header and purple actions. The guide includes current Chrome captures and a clearly identified notification widget fixture. An Android debug test build is supplied for the local computer-backed demonstration. It is not a signed store release or evidence of a physical-phone test.

## 4.70 min · Data model and authorization

Firestore is a document database, not a SQL database. A report links to its reporter and assigned team, with update documents in a subcollection. Notifications belong to their recipient. Audit records capture operational changes. Server-only ledgers support submission identities, photo cleanup and post-commit effects. Client rules deny direct operational writes. Report reads are restricted to permitted staff, the owning resident or the currently assigned responder team. The source package includes the schema explanation, security rules and required composite indexes.

## 5.30 min · Reliability and access changes

Lost responses were a major challenge. The solution keeps stable keys for unresolved payloads, so an unchanged retry can return the original outcome. Distinct unresolved versions retain their own keys, and a sixth version is blocked instead of silently evicting an earlier one. Another challenge was stale access after a team or role change. Profile synchronization hides protected content while permissions update, and session guards ignore late callbacks from an older sign-in. Long histories use bounded queries. Photo cleanup has recovery tests, while real provider behavior remains a separate gate.

## 5.91 min · Verification and honest limits

The latest local audit passed five hundred seventy-nine web tests, four hundred sixty-three API tests, sixty-five emulator adapter checks, and one hundred sixty security-rule tests. Flutter analysis and its current test suite are recorded separately with the final source. Local route checks covered responsive layouts, accessibility automation and the notification interaction across three browser engines. These results have limits. Actual phones, iOS signing, assistive technology, real photo delivery, email and push still need their own checks. Synthetic narration does not replace the members participation or their explanation of the project.

## 6.59 min · Submission and demonstration

The submission includes editable source, the database schema and rules, the PowerPoint user guide and its PDF, this narrated walkthrough with captions, and a contribution sheet. The named members are Raymond D G Lopez, Justine De Leon, and Liam Cabuguang. The owners submission name and each persons actual contribution remain marked for confirmation. Please complete those entries truthfully before handing in the project. The local demonstration uses dedicated ports and fictional fixtures. Use the included instructions to start the stack, open the web app, or connect the Android test build. Thank you.
