#!/usr/bin/env bash
#
# build-android.sh — Build, sync, and install the Astolfy app on a
# connected Android device via USB.
#
# Requirements (one-time setup):
#   1. Node.js + pnpm (or npm)
#   2. Android Studio (for the SDK + platform-tools)
#      - Set ANDROID_HOME to the SDK path
#      - Accept licenses:  yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
#   3. JDK 17 (Android Gradle Plugin 8.x requires it)
#   4. A device connected via USB with USB debugging enabled
#      (Settings → Developer options → USB debugging)
#
# Verify the device is visible:
#   adb devices
#
# Usage:
#   ./build-android.sh           # debug build + install
#   ./build-android.sh release    # release build (unsigned APK in
#                                 # android/app/build/outputs/apk/release/)
#
set -euo pipefail

cd "$(dirname "$0")"

BUILD_TYPE="${1:-debug}"

echo "==> [1/5] Installing JS dependencies (pnpm, fallback npm)"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi

echo "==> [2/5] Building the web app (Vite → dist/)"
npm run build

echo "==> [3/5] Adding Capacitor Android platform (if missing)"
if [ ! -d "android" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm add -D @capacitor/android @capacitor/cli
    pnpm exec cap add android
  else
    npm install -D @capacitor/android @capacitor/cli
    npx cap add android
  fi
fi

echo "==> [4/5] Syncing web build into the native project"
if command -v pnpm >/dev/null 2>&1; then
  pnpm exec cap sync android
else
  npx cap sync android
fi

echo "==> [5/5] Building the APK ($BUILD_TYPE) and installing on device"
cd android

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  echo "==> Release APK ready: android/$APK_PATH"
  echo "    (Sign it with apksigner before distributing.)"
else
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  echo "==> Installing debug APK on connected device..."
  adb install -r "$APK_PATH"
  echo "==> Done! Launch 'astolfy' on your phone."
fi