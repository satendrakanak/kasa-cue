#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCH="${KASA_DESKTOP_ARCH:-arm64}"

if [[ "$ARCH" != "arm64" && "$ARCH" != "x64" ]]; then
  echo "Unsupported Mac architecture: $ARCH. Use arm64 or x64."
  exit 1
fi

MAC_OUTPUT_DIR="mac-arm64"
if [[ "$ARCH" == "x64" ]]; then
  MAC_OUTPUT_DIR="mac"
fi

ARTIFACT_BASENAME="Kasa-Cue-mac-$ARCH"
APP_PATH="$ROOT_DIR/dist/$MAC_OUTPUT_DIR/Kasa Cue.app"
DMG_PATH="$ROOT_DIR/dist/$ARTIFACT_BASENAME.dmg"
RW_DMG_PATH="$ROOT_DIR/dist/$ARTIFACT_BASENAME-rw.dmg"
ZIP_PATH="$ROOT_DIR/dist/$ARTIFACT_BASENAME.zip"
DOWNLOAD_PATH="$ROOT_DIR/desktop-downloads/$ARTIFACT_BASENAME.dmg"
DOWNLOAD_ZIP_PATH="$ROOT_DIR/desktop-downloads/$ARTIFACT_BASENAME.zip"
VOLUME_NAME="Kasa Cue 0.1.0-$ARCH"
SIGN_IDENTITY="${DEVELOPER_ID_APPLICATION:-}"

cd "$ROOT_DIR"

npx electron-builder \
  --projectDir electron \
  --config ../electron-builder.desktop.json \
  --mac dir \
  "--$ARCH"

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

rm -f "$DMG_PATH" "$RW_DMG_PATH" "$ZIP_PATH"

hdiutil create \
  "$RW_DMG_PATH" \
  -volname "$VOLUME_NAME" \
  -size 420m \
  -fs APFS

hdiutil attach "$RW_DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse

ditto "$APP_PATH" "$MOUNT_DIR/Kasa Cue.app"
ln -s /Applications "$MOUNT_DIR/Applications"

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
    set icon size of icon view options of targetWindow to 96
    set position of item "Kasa Cue.app" of mountFolder to {170, 160}
    set position of item "Applications" of mountFolder to {430, 160}
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

ZIP_STAGE_DIR="$(mktemp -d /tmp/kasa-cue-zip.XXXXXX)"
trap 'hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true; rm -rf "$STAGE_DIR" "$MOUNT_DIR" "$RW_DMG_PATH" "$ZIP_STAGE_DIR"' EXIT

cp "$DMG_PATH" "$ZIP_STAGE_DIR/$ARTIFACT_BASENAME.dmg"
cat > "$ZIP_STAGE_DIR/How to Install Kasa Cue.txt" <<README
Kasa Cue for Mac

Install:
1. Double-click $ARTIFACT_BASENAME.dmg.
2. Drag Kasa Cue.app to Applications.
3. Open Applications.
4. On first launch, right-click Kasa Cue and choose Open.
5. If macOS only shows Done or Move to Bin, double-click Fix & Open Kasa Cue.command from this ZIP.

Why this is needed:
macOS may ask for confirmation because this free build is not notarized by Apple.
README
cat > "$ZIP_STAGE_DIR/Fix & Open Kasa Cue.command" <<'CMD'
#!/usr/bin/env bash
set -euo pipefail

APP_PATH="/Applications/Kasa Cue.app"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DMG_PATH="$(find "$SCRIPT_DIR" -maxdepth 1 -name 'Kasa-Cue-mac-*.dmg' -print -quit)"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Kasa Cue is not installed in Applications yet."
  echo "Opening the installer DMG now. Drag Kasa Cue.app to Applications, then run this file again."
  if [[ -f "$DMG_PATH" ]]; then
    xattr -dr com.apple.quarantine "$DMG_PATH" 2>/dev/null || true
    xattr -cr "$DMG_PATH" 2>/dev/null || true
    open "$DMG_PATH"
  fi
  read -r -p "Press Return to close."
  exit 0
fi

echo "Allowing this local Kasa Cue install to open..."
xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
xattr -cr "$APP_PATH" 2>/dev/null || true
codesign --verify --deep --strict "$APP_PATH" 2>/dev/null || true

echo "Opening Kasa Cue..."
open "$APP_PATH"
echo "Done. You can close this window."
CMD
chmod +x "$ZIP_STAGE_DIR/Fix & Open Kasa Cue.command"

(
  cd "$ZIP_STAGE_DIR"
  zip -q "$ZIP_PATH" "$ARTIFACT_BASENAME.dmg" "How to Install Kasa Cue.txt" "Fix & Open Kasa Cue.command"
)
cp "$ZIP_PATH" "$DOWNLOAD_ZIP_PATH"
xattr -cr "$ZIP_PATH" "$DOWNLOAD_ZIP_PATH"

if [[ -n "$SIGN_IDENTITY" && -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  xcrun notarytool submit "$DMG_PATH" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --wait
  xcrun stapler staple "$DMG_PATH"
  cp "$DMG_PATH" "$DOWNLOAD_PATH"
  cp "$ZIP_PATH" "$DOWNLOAD_ZIP_PATH"
  xattr -cr "$DMG_PATH" "$DOWNLOAD_PATH"
  xattr -cr "$ZIP_PATH" "$DOWNLOAD_ZIP_PATH"
else
  echo "Not notarized. Set DEVELOPER_ID_APPLICATION, APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_SPECIFIC_PASSWORD for public distribution."
fi

echo "Desktop DMG ready: $DOWNLOAD_PATH"
echo "Desktop ZIP ready: $DOWNLOAD_ZIP_PATH"
