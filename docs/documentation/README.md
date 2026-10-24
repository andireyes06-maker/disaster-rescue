# Rescue Reports: project documentation

Status: written 24 October 2026 against commit `978fe7e` (branch `build/disaster-rescue`).

Rescue Reports lets residents report emergencies from a phone, lets administrators review and verify those reports on a website, and lets rescue teams (responders) receive assignments and record progress from the phone and the website.

## Who uses what

| Role | Platform | What they do |
|---|---|---|
| Administrator | Website only | Reviews the incident queue, validates reports by hand, rejects or marks duplicates, sets priority and classification, assigns rescue teams, closes reports, manages teams and users, reads the audit log, analytics, exports and the map |
| Rescuer (responder) | Mobile app and website | Sees assignments for their own team, acknowledges them, posts field updates, reads closed reports of their team |
| Resident | Mobile app only | Submits reports with photos and location, follows status and updates, cancels a report before it is verified |
| Dispatcher, DMO | No access | Retired by the professor's clarification (23 October 2026). Accounts and history are kept. Sign-in and every API route refuse them |

This is the approved role model (option A, amended for rescuers on 24 October 2026). The source of truth is `docs/role-matrix.md` and `docs/superpowers/specs/2026-10-23-professor-clarification-design.md`.

## Contents

| File | Read it for |
|---|---|
| [how-it-works.md](how-it-works.md) | Architecture, stacks, data model, report lifecycle, security model, hosting |
| [setup-and-run.md](setup-and-run.md) | Installing, running the demo, running every test suite, deploying, building the APK, environment variable names |
| [user-guide.md](user-guide.md) | Step-by-step instructions for each role |
| [accounts.md](accounts.md) | Demo accounts with their sign-in details (emulator only) and the policy for real accounts |
| [audit-2026-10-24.md](audit-2026-10-24.md) | The full audit: what was tested, the results, every finding with severity, and what is still open |

## Related documents already in the repository

- `HANDOFF.md`: current release state (a separate session's handoff; read its date before trusting it)
- `docs/role-matrix.md`: the role model and its current status in code
- `docs/deploy.md`: the original deployment plan (older; setup-and-run.md has the verified order)
- `docs/firebase-setup.md`, `docs/schema.md`, `docs/privacy-and-coordination.md`, `docs/backup-and-recovery.md`
- `docs/video-script.md`, `docs/user-guide/outline.md`: presentation material
- `docs/release/`: release records

## What is not in these files

- No production passwords, service-account files, API keys, or Cloudinary secrets. Those live in Vercel, Render and Firebase, not in the repository.
- No real resident or staff data.
