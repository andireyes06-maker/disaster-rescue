#!/bin/sh
set -eu
RESCUE_SOURCE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RESCUE_FLUTTER_COMMAND=${RESCUE_FLUTTER_BIN:-flutter}
cd "$RESCUE_SOURCE_ROOT/mobile"
"$RESCUE_FLUTTER_COMMAND" build apk --debug \
  --dart-define=USE_EMULATORS=true \
  --dart-define=EMULATOR_HOST=127.0.0.1 \
  --dart-define=AUTH_EMULATOR_PORT=9407 \
  --dart-define=FIRESTORE_EMULATOR_PORT=8407 \
  --dart-define=API_BASE_URL=http://127.0.0.1:3407/api
mkdir -p "$RESCUE_SOURCE_ROOT/artifacts"
cp build/app/outputs/flutter-apk/app-debug.apk "$RESCUE_SOURCE_ROOT/artifacts/Rescue-Reports-USB-Test.apk"
printf '%s\n' "Built artifacts/Rescue-Reports-USB-Test.apk. Local demo only; use ADB reverse with scripts/connect-android-demo.mjs."
