# Integrated web page ledger

These are rendered checks against the combined source, not a claim of universal completion. Exact per-case results and motion records are in surfaces/surfaces.json; functional evidence and remaining service/device/cross-browser gates are in HANDOFF.md.

| Route | Contexts | Widths | Rendered result |
|---|---|---|---|
| `/` | public | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/admin` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/analytics` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/assignments` | admin, responder | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/audit` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/audit-address-not-found` | public | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/dashboard` | admin, dispatcher | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/forbidden` | public | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/incidents/demo-report-05` | admin, dispatcher, dmo | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/login` | public | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/map` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/monitor` | admin, dmo | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/my` | resident | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/my/report` | resident | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/my/reports/demo-report-05` | resident | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/register` | public | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/teams` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |
| `/users` | admin | 390, 768, 1024, 1440 | Pass: axe, overflow, required markers, recorded normal motion |

Admin Accounts, Teams, System health/settings, and Audit/exports were additionally opened at all four widths: 16 cases, no axe or overflow findings, no sampled visible text below 13px.

Functional checks are recorded in browser-integrated.json, extended-workflows.json, history-offline.json and role-guards.json. A missing-report state and every possible loading/error/long-content variation were not rerun in this fresh sweep; earlier evidence remains historical, not new integration certification.
