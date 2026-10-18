#!/bin/bash
# Restarts only the release-audit stack: our emulator, API and web, found by their fixed ports.
S=/private/tmp/claude-501/-Users-rien-Documents-FINAL-PROJECT/12c512fa-e0a9-403a-9dae-e5b68c155771/scratchpad/audit
for p in 5178 3105 8080 9099; do
  for pid in $(lsof -nP -iTCP:$p -sTCP:LISTEN -t 2>/dev/null); do kill $pid 2>/dev/null; done
done
sleep 4
cd /Users/rien/Documents/FINAL_PROJECT-fixes && (firebase emulators:start --only auth,firestore --project demo-release-audit > $S/emulators.log 2>&1 &)
for i in $(seq 1 60); do grep -q "All emulators ready" $S/emulators.log 2>/dev/null && break; sleep 1; done
cd $S && FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node seed.cjs > /dev/null 2>&1 && echo "seeded"
cd /Users/rien/Documents/FINAL_PROJECT-fixes/api && (env -i PATH="$PATH" HOME="$HOME" PORT=3105 CORS_ORIGINS=http://localhost:5178 FIREBASE_PROJECT_ID=demo-release-audit GOOGLE_APPLICATION_CREDENTIALS=$S/sa.json FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 CLOUDINARY_CLOUD_NAME=audit-placeholder CLOUDINARY_API_KEY=audit-placeholder CLOUDINARY_API_SECRET=audit-placeholder node src/server.js > $S/api.log 2>&1 &)
cd /Users/rien/Documents/FINAL_PROJECT-fixes/web && (env -i PATH="$PATH" HOME="$HOME" VITE_API_BASE_URL=http://localhost:3105/api VITE_FIREBASE_API_KEY=audit-local-key VITE_FIREBASE_AUTH_DOMAIN=demo-release-audit.firebaseapp.com VITE_FIREBASE_PROJECT_ID=demo-release-audit VITE_FIREBASE_APP_ID=audit-local VITE_USE_EMULATORS=true node node_modules/vite/bin/vite.js --host localhost --port 5178 --strictPort > $S/web.log 2>&1 &)
for i in $(seq 1 30); do curl -s http://localhost:3105/api/health >/dev/null 2>&1 && curl -s -o /dev/null http://localhost:5178/login && break; sleep 1; done
curl -s http://localhost:3105/api/health; echo
