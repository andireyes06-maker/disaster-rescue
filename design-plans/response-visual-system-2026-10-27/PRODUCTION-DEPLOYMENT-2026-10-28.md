# UI production deployment, October 28, 2026

Owner explicitly requested main Vercel deployment after the UI commit and push.

- Source commit: `2aeff5d27f11e6392d4bdad75bcf162c39c6cd78`, clean git archive; no local untracked files uploaded.
- Project: `personalfranz/disaster-rescue-web`, project root `web`.
- Production: https://disaster-rescue-web.vercel.app
- Deployment: `dpl_BXGbLedMbm7w8BZqysJeCkARgRyG`, Ready.
- Inspector: https://vercel.com/personalfranz/disaster-rescue-web/BXGbLedMbm7w8BZqysJeCkARgRyG
- Previous production for rollback: `dpl_7ebRsr6S5tgzRTe2vFbYs17zABWq`, https://disaster-rescue-q1euxnjx1-personalfranz.vercel.app
- Production release configuration validator passed; existing production environment used without changes.
- Live `/build-identity.json` exactly matches clean source fingerprint `c622f1ef9874b00c1a73574cc8e4173dd0e178aa9a70d08c68a2c15089c998ed`.
- Chromium read-only smoke: landing, login, register/app handoff and signed-out dashboard at 390/1440; no page exceptions or horizontal overflow; dashboard redirects to login.
- Signed-in production operations were not submitted. Their UI checks were on the local emulator before deployment. API, rules and native app not deployed. Git production branch remains unchanged; this is a direct Vercel release of the review commit.
- Tools/skills: Vercel CLI with installed deployments-cicd and vercel-cli guidance, local Playwright, source fingerprint verifier.

Build install log reports one high-severity undici advisory. Confirmed with npm audit, saved in evidence/deployment-audit.json. Package files were unchanged by the UI commit; dependency remediation and runtime exposure were not assessed in this deployment task. Do not describe dependency audit as clean.

Owner reviews live site before any Claude handoff. Earlier handoff's no-deployment statement describes the prior implementation phase and is superseded by this deployment record.
