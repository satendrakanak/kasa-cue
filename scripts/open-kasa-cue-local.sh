#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-/Applications/Kasa Cue.app}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Kasa Cue.app not found at: $APP_PATH"
  echo "Install it first by dragging Kasa Cue into Applications."
  exit 1
fi

xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
codesign --verify --deep --strict "$APP_PATH"
open "$APP_PATH"
