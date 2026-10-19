#!/bin/sh
set -eu
case "${CONFIGURATION:-}" in
  Release*)
    case "${RESCUE_BUNDLE_ID:-}" in
      ""|local.*) echo "Release requires a service-owned RESCUE_BUNDLE_ID." >&2; exit 1 ;;
    esac
    if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
      echo "Release requires the service's Apple DEVELOPMENT_TEAM." >&2; exit 1
    fi
    ;;
esac
