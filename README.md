# Rescue Reports

A system for reporting and coordinating disaster rescue requests. Residents submit reports with location and photos, dispatchers and responders track and act on them, and DMOs (disaster management offices) get live status and exports.

## Components

- `api/`: Express API. The only writer of important data. Verifies Firebase ID tokens, enforces roles and the status workflow, uploads photos to Cloudinary.
- `web/`: React web app for residents, dispatchers, responders, DMOs and administrators.
- `mobile/`: Flutter app for residents and responders.
- `docs/`: specs, plans, design tokens (`docs/design-tokens/tokens.json`).

Current source and verified repair status: [HANDOFF.md](HANDOFF.md). Use Node 22 (`.nvmrc`) and the checked-in lockfiles. Hosted deployment and native signing still require approved owner configuration.

## Getting started

```
cd api
cp .env.example .env
npm ci
npm test
```

Never commit `api/serviceAccount.json` or any `.env` file.
