# Harbor presentation workspace

Run from `api/`:

```sh
npm run presentation
```

Open **http://localhost:5176**. This runs the current website source with a separate local API and Firebase emulator project, `demo-harbor-presentation`. It does not change the audit workspace on 5174 or any production configuration.

The fictional content contains 24 linked reports across the response lifecycle, 12 rescue teams, 12 named people, resident notifications, response updates, and audit histories. Dates are based on the launch time. Addresses include specific Harbor landmarks. It deliberately includes no incident photographs: generated schematic fixtures are not presented as operational evidence. Real attachment rendering and upload behavior are unchanged in the application.

## Sign in

| Role | Email |
| --- | --- |
| Resident | maya.torres@harbor.example |
| Dispatcher | marco.reyes@harbor.example |
| Disaster management officer | adrian.santos@harbor.example |
| Responder | daniel.flores@harbor.example |
| Admin | elena.cruz@harbor.example |

Use the emulator password configured by `DEMO_PASSWORD`, or the existing seed script's local default. Never use a real password. These accounts are separate from their identically named QA counterparts.

## Isolation and repeatability

- Presentation web 5176; API 3103; Auth 9399; Firestore 8290; emulator hub 4416; logging 4516; Firestore websocket 9166.
- The launcher refuses occupied ports instead of stopping another service. It requires the exact presentation project and dedicated loopback emulator addresses, strips service-account and Cloudinary environment variables, and refuses to seed over existing report data.
- Stop with Ctrl+C in the launching terminal. The dedicated emulators are ephemeral: a fresh launch recreates the clean scenario. Edits made during a presentation session are not retained after shutdown.
- QA remains on its original project/ports, with test accounts, reports, evidence, and validation scenarios preserved. Run destructive or stress tests there, not in the presentation workspace.
- No hotline is invented. The resident notice provides clear guidance without a fake phone number. Admin's hotline field remains empty until the owner supplies a verified number for the intended service area.
- This is fictional local presentation content, not evidence that rescue operations or a production release have occurred. Do not seed it into production.

## Review routes

Use `/dashboard`, `/users`, and each expanded `/admin` section as admin. Use `/my`, `/my/report`, `/my/reports/demo-report-05`, and `/my/reports/demo-report-15` as resident; the latter demonstrates an active response history. Use `/assignments` as responder. The same public landing and access pages are served by this workspace.
