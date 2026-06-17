#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="$ROOT_DIR/dist/mac-arm64/Kasa Cue.app"
DMG_PATH="$ROOT_DIR/dist/Kasa-Cue-mac-arm64.dmg"
RW_DMG_PATH="$ROOT_DIR/dist/Kasa-Cue-mac-arm64-rw.dmg"
DOWNLOAD_PATH="$ROOT_DIR/desktop-downloads/Kasa-Cue-mac-arm64.dmg"
VOLUME_NAME="Kasa Cue 0.1.0-arm64"
SIGN_IDENTITY="${DEVELOPER_ID_APPLICATION:-}"

cd "$ROOT_DIR"

npx electron-builder \
  --projectDir electron \
  --config ../electron-builder.desktop.json \
  --mac dir \
  --arm64

xattr -cr "$APP_PATH"

if [[ -n "$SIGN_IDENTITY" ]]; then
  codesign \
    --force \
    --deep \
    --options runtime \
    --entitlements "$ROOT_DIR/electron/entitlements.mac.plist" \
    --sign "$SIGN_IDENTITY" \
    "$APP_PATH"
else
  echo "No DEVELOPER_ID_APPLICATION set; using ad-hoc signing for local testing."
  codesign --force --deep --sign - --timestamp=none "$APP_PATH"
fi

codesign --verify --deep --strict --verbose=2 "$APP_PATH"

STAGE_DIR="$(mktemp -d /tmp/kasa-cue-dmg.XXXXXX)"
MOUNT_DIR="$(mktemp -d /tmp/kasa-cue-mount.XXXXXX)"
trap 'hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true; rm -rf "$STAGE_DIR" "$MOUNT_DIR" "$RW_DMG_PATH"' EXIT

rm -f "$DMG_PATH" "$RW_DMG_PATH"

hdiutil create \
  "$RW_DMG_PATH" \
  -volname "$VOLUME_NAME" \
  -size 420m \
  -fs APFS

hdiutil attach "$RW_DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse

ditto "$APP_PATH" "$MOUNT_DIR/Kasa Cue.app"
ln -s /Applications "$MOUNT_DIR/Applications"
cat > "$MOUNT_DIR/Install & Open Kasa Cue.command" <<'CMD'
#!/usr/bin/env bash
set -euo pipefail

SOURCE_APP="$(cd "$(dirname "$0")" && pwd)/Kasa Cue.app"
TARGET_APP="/Applications/Kasa Cue.app"

if [[ ! -d "$SOURCE_APP" ]]; then
  echo "Could not find Kasa Cue.app next to this installer."
  read -r -p "Press Return to close."
  exit 1
fi

echo "Installing Kasa Cue to /Applications..."
rm -rf "$TARGET_APP"
ditto "$SOURCE_APP" "$TARGET_APP"

echo "Removing macOS download quarantine for this local build..."
xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
xattr -cr "$TARGET_APP" 2>/dev/null || true

echo "Verifying app signature..."
codesign --verify --deep --strict "$TARGET_APP" 2>/dev/null || true

echo "Opening Kasa Cue..."
open "$TARGET_APP"
echo "Done. You can close this window."
CMD
chmod +x "$MOUNT_DIR/Install & Open Kasa Cue.command"
cat > "$MOUNT_DIR/README - Open Kasa Cue.txt" <<'README'
Kasa Cue desktop app

If double-clicking the app shows "Apple could not verify Kasa Cue", use:

1. Double-click "Install & Open Kasa Cue.command"
2. Let it copy Kasa Cue to Applications
3. The script removes quarantine for this local build and opens the app

For normal one-click opening on every Mac, Kasa Cue must be signed with an
Apple Developer ID certificate and notarized by Apple.
README

osascript <<OSA || true
set mountFolder to POSIX file "$MOUNT_DIR" as alias
tell application "Finder"
  tell folder mountFolder
    open
    delay 0.5
    set targetWindow to container window
    set current view of targetWindow to icon view
    set toolbar visible of targetWindow to false
    set statusbar visible of targetWindow to false
    set bounds of targetWindow to {100, 100, 700, 430}
    set arrangement of icon view options of targetWindow to not arranged
    set icon size of icon view options of targetWindow to 84
    set position of item "Kasa Cue.app" of mountFolder to {150, 150}
    set position of item "Applications" of mountFolder to {430, 150}
    try
      set position of item "Install & Open Kasa Cue.command" of mountFolder to {150, 300}
    end try
    try
      set position of item "README - Open Kasa Cue.txt" of mountFolder to {430, 300}
    end try
    update without registering applications
    delay 1
    close targetWindow
  end tell
end tell
OSA

sync
hdiutil detach "$MOUNT_DIR"

hdiutil convert \
  "$RW_DMG_PATH" \
  -format UDZO \
  -o "$DMG_PATH"

mkdir -p "$ROOT_DIR/desktop-downloads"
cp "$DMG_PATH" "$DOWNLOAD_PATH"
xattr -cr "$DMG_PATH" "$DOWNLOAD_PATH"
hdiutil verify "$DMG_PATH"

if [[ -n "$SIGN_IDENTITY" && -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  xcrun notarytool submit "$DMG_PATH" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --wait
  xcrun stapler staple "$DMG_PATH"
  cp "$DMG_PATH" "$DOWNLOAD_PATH"
  xattr -cr "$DMG_PATH" "$DOWNLOAD_PATH"
else
  echo "Not notarized. Set DEVELOPER_ID_APPLICATION, APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_SPECIFIC_PASSWORD for public distribution."
fi

echo "Desktop DMG ready: $DOWNLOAD_PATH"
