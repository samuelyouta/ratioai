#!/usr/bin/env bash
# Generate iOS app icon, splash, and App Store screenshot frames from repo assets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"
SPLASH_DIR="$ROOT/ios/App/App/Assets.xcassets/Splash.imageset"
SHOT_DIR="$ROOT/ios/AppStore/screenshots"
LOGO="$ROOT/src/assets/logo.jpg"
BG="#0a0a0a"

mkdir -p "$ICON_DIR" "$SPLASH_DIR" "$SHOT_DIR"

echo "→ App icon (1024×1024)"
ffmpeg -y -hide_banner -loglevel error -i "$LOGO" \
  -vf "scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=$BG" \
  "$ICON_DIR/AppIcon-512@2x.png"

echo "→ Splash screens"
ffmpeg -y -hide_banner -loglevel error -i "$LOGO" \
  -vf "scale=2732:2732:force_original_aspect_ratio=decrease,pad=2732:2732:(ow-iw)/2:(oh-ih)/2:color=$BG" \
  "$SPLASH_DIR/splash-2732x2732-2.png"
ffmpeg -y -hide_banner -loglevel error -i "$LOGO" \
  -vf "scale=1366:1366:force_original_aspect_ratio=decrease,pad=1366:1366:(ow-iw)/2:(oh-ih)/2:color=$BG" \
  "$SPLASH_DIR/splash-2732x2732-1.png"
ffmpeg -y -hide_banner -loglevel error -i "$LOGO" \
  -vf "scale=911:911:force_original_aspect_ratio=decrease,pad=911:911:(ow-iw)/2:(oh-ih)/2:color=$BG" \
  "$SPLASH_DIR/splash-2732x2732.png"

echo "→ App Store screenshots (iPhone 6.7\" — 1290×2796)"
i=1
for src in "$ROOT/src/assets/app-preview-1.png" "$ROOT/src/assets/app-preview-2.png" "$ROOT/src/assets/app-preview-3.png"; do
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "scale=1290:2796:force_original_aspect_ratio=decrease,pad=1290:2796:(ow-iw)/2:(oh-ih)/2:color=$BG" \
    "$SHOT_DIR/iphone67-0${i}.png"
  i=$((i + 1))
done

echo "Done. Screenshots: $SHOT_DIR"
