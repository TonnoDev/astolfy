#!/usr/bin/env bash
#
# build-android.sh — Build, sync, and install the Astolfy app on a
# connected Android device via USB.
#
# Requirements (one-time setup):
#   1. Node.js + pnpm (or npm)
#   2. Android SDK (platform-tools + platforms;android-<N> + build-tools)
#      - This script auto-detects the SDK in these locations:
#          $ANDROID_HOME, $ANDROID_SDK_ROOT,
#          ~/Android/Sdk, ~/AndroidSdk, ~/android-sdk,
#          ~/.android-sdk, /opt/android-sdk, /usr/lib/android-sdk
#        You can also set ANDROID_HOME manually to override detection.
#   3. JDK 21+ — Capacitor 8's Android library is Java 21 bytecode
#      (AGP 8.x also runs fine on 21). This script auto-detects the
#      newest installed JDK. On Ubuntu/Debian:
#          sudo apt-get install -y openjdk-21-jdk-headless
#   4. A device connected via USB with USB debugging enabled
#      (Settings → Developer options → USB debugging)
#
# App icon / splash:
#   The script auto-generates Android icons & splash screens from a source
#   logo using @capacitor/assets (already in devDependencies). It looks for
#   a source image (icon.png / logo.png) in an `assets/` or `resources/`
#   folder at the project root. If none is found, it bootstraps one from
#   src/assets/astolfyLogo.png. To use a custom hi-res icon (recommended
#   ≥1024×1024), place it at assets/icon.png.
#
# Verify the device is visible & authorized:
#   adb devices        # the line must end with "device" (not "unauthorized")
#
# Usage:
#   ./build-android.sh            # debug build + install on connected device
#   ./build-android.sh release    # release build (unsigned APK in
#                                 # android/app/build/outputs/apk/release/)
#
set -euo pipefail

cd "$(dirname "$0")"

BUILD_TYPE="${1:-debug}"

# App icon / splash background colors (used by @capacitor/assets).
# Edit these to match the Astolfy brand.
ICON_BG="#000"
ICON_BG_DARK="#111111"
SPLASH_BG="#ffffff"
SPLASH_BG_DARK="#111111"

# Fallback logo used to bootstrap assets/icon.png if no source exists.
FALLBACK_LOGO="src/assets/astolfy.jpeg"

# --- helpers -----------------------------------------------------------------

info()  { printf '==> %s\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()   { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1; }

# --- detect Android SDK -------------------------------------------------------

detect_android_sdk() {
  local candidates=(
    "${ANDROID_HOME:-}"
    "${ANDROID_SDK_ROOT:-}"
    "$HOME/Android/Sdk"
    "$HOME/AndroidSdk"
    "$HOME/android-sdk"
    "$HOME/.android-sdk"
    "/opt/android-sdk"
    "/usr/lib/android-sdk"
    "/usr/share/android-sdk"
  )
  for dir in "${candidates[@]}"; do
    [ -z "$dir" ] && continue
    # A real SDK has either platform-tools/ or platforms/ inside it.
    if [ -d "$dir" ] && { [ -d "$dir/platform-tools" ] || [ -d "$dir/platforms" ]; }; then
      echo "$dir"
      return 0
    fi
  done
  return 1
}

device_authorized() {
  # adb devices prints a header line, then "<serial>\t<state>" rows.
  # An authorized, ready device has state "device".
  adb devices | awk 'NR>1 && NF>=2 && $2=="device"{found=1} END{exit !found}'
}

# Locate the @capacitor/assets source folder (Easy Mode: contains
# icon.png/logo.png; Custom Mode: icon-foreground/icon-background/etc.).
find_asset_source_dir() {
  local d f
  for d in "assets" "resources"; do
    [ -d "$d" ] || continue
    for f in "$d"/icon.png "$d"/icon.jpg "$d"/logo.png "$d"/logo.jpg \
             "$d"/icon-foreground.png "$d"/icon-background.png \
             "$d"/icon-only.png "$d"/splash.png "$d"/splash-dark.png; do
      if [ -f "$f" ]; then echo "$d"; return 0; fi
    done
  done
  return 1
}

# --- pre-flight checks -------------------------------------------------------

info "Pre-flight checks"

# Pick the best installed JDK, preferring 21+ (Capacitor 8 needs Java 21).
# Looks in: $JAVA_HOME, $PATH, /usr/lib/jvm/*, SDKMAN, asdf.
pick_jdk_home() {
  local best="" best_major=0 major
  local dirs=()
  [ -n "${JAVA_HOME:-}" ] && dirs+=("$JAVA_HOME")
  # /usr/lib/jvm entries (e.g. java-21-openjdk-amd64, java-17-openjdk-amd64)
  while IFS= read -r -d '' d; do dirs+=("$d"); done < <(find /usr/lib/jvm -maxdepth 1 -type d -print0 2>/dev/null || true)
  # SDKMAN
  [ -d "$HOME/.sdkman/candidates/java" ] && while IFS= read -r -d '' d; do dirs+=("$d"); done < <(find "$HOME/.sdkman/candidates/java" -maxdepth 1 -mindepth 1 -type d -print0 2>/dev/null || true)
  # asdf
  [ -d "$HOME/.asdf/installs/java" ] && while IFS= read -r -d '' d; do dirs+=("$d"); done < <(find "$HOME/.asdf/installs/java" -maxdepth 1 -mindepth 1 -type d -print0 2>/dev/null || true)

  for d in "${dirs[@]}"; do
    [ -z "$d" ] && continue
    [ -x "$d/bin/java" ] || continue
    major="$("$d/bin/java" -version 2>&1 | head -n1 | sed -E 's/.*version "([0-9]+).*/\1/')"
    [ -z "$major" ] && continue
    if [ "$major" -gt "$best_major" ]; then
      best_major="$major"; best="$d"
    fi
  done
  [ -n "$best" ] && { echo "$best"; return 0; }
  return 1
}

if ! JDK_HOME="$(pick_jdk_home || true)"; then
  die "No JDK found. Install JDK 21 (Capacitor 8 requires Java 21):  sudo apt-get install -y openjdk-21-jdk-headless"
fi
export JAVA_HOME="$JDK_HOME"
case ":$PATH:" in
  *":$JDK_HOME/bin:"*) ;;
  *) export PATH="$JDK_HOME/bin:$PATH" ;;
esac
JAVA_MAJOR="$("$JDK_HOME/bin/java" -version 2>&1 | head -n1 | sed -E 's/.*version "([0-9]+).*/\1/')"
ok "JDK $JAVA_MAJOR ($JDK_HOME)"

# Capacitor 8's capacitor-android is Java 21 bytecode; warn hard if <21.
if [ "$JAVA_MAJOR" -lt 21 ]; then
  cat >&2 <<EOF
  ✗ JDK $JAVA_MAJOR is too old for Capacitor 8 (its Android library needs Java 21).
    Install JDK 21 and re-run, e.g. on Ubuntu/Debian:
        sudo apt-get install -y openjdk-21-jdk-headless
    (This script will auto-detect and use it via JAVA_HOME.)
EOF
  exit 1
fi

ANDROID_SDK_DIR="$(detect_android_sdk || true)"
if [ -z "$ANDROID_SDK_DIR" ]; then
  cat >&2 <<EOF
  Android SDK not found. Either:
    • Set ANDROID_HOME (e.g. export ANDROID_HOME=\$HOME/Android/Sdk), or
    • Install the SDK via Android Studio / cmdline-tools under ~/Android/Sdk.
  Required components: platform-tools, platforms;android-36, build-tools;36.x.
EOF
  exit 1
fi
export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"
ok "Android SDK: $ANDROID_SDK_DIR"

# Make platform-tools (adb, etc.) available even if not on PATH.
PLATFORM_TOOLS_DIR="$ANDROID_SDK_DIR/platform-tools"
if [ -d "$PLATFORM_TOOLS_DIR" ]; then
  case ":$PATH:" in
    *":$PLATFORM_TOOLS_DIR:"*) ;;
    *) export PATH="$PLATFORM_TOOLS_DIR:$PATH" ;;
  esac
fi
require_cmd adb || warn "adb not found; the device-install step will be skipped."

# Ensure android/local.properties points at the SDK so Gradle can find it.
# This file is gitignored and safe to (re)generate.
LOCAL_PROPS="android/local.properties"
need_write=1
if [ -f "$LOCAL_PROPS" ] && grep -q "^sdk\.dir=$ANDROID_SDK_DIR$" "$LOCAL_PROPS"; then
  need_write=0
fi
if [ "$need_write" = "1" ]; then
  info "Writing $LOCAL_PROPS (sdk.dir)"
  mkdir -p android
  {
    echo "## Auto-generated by build-android.sh — do not commit (gitignored)."
    echo "sdk.dir=$ANDROID_SDK_DIR"
  } > "$LOCAL_PROPS"
  ok "sdk.dir=$ANDROID_SDK_DIR"
fi

# --- 1/6 — JS deps -----------------------------------------------------------

echo "==> [1/6] Installing JS dependencies (pnpm, fallback npm)"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi

# --- 2/6 — web build ---------------------------------------------------------

echo "==> [2/6] Building the web app (Vite → dist/)"
npm run build

# --- 3/6 — Capacitor platform ------------------------------------------------

echo "==> [3/6] Adding Capacitor Android platform (if missing)"
if [ ! -d "android" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm add -D @capacitor/android @capacitor/cli
    pnpm exec cap add android
  else
    npm install -D @capacitor/android @capacitor/cli
    npx cap add android
  fi
fi

# --- 4/6 — sync --------------------------------------------------------------

echo "==> [4/6] Syncing web build into the native project"
if command -v pnpm >/dev/null 2>&1; then
  pnpm exec cap sync android
else
  npx cap sync android
fi

# --- 5/6 — Generate app icons & splash (Capacitor Assets) --------------------

echo "==> [5/6] Generating app icons & splash"

# Bootstrap a source icon if none exists, so the Astolfy logo replaces the
# default Capacitor icon automatically.
ASSET_SRC="$(find_asset_source_dir || true)"
if [ -z "$ASSET_SRC" ]; then
  if [ -f "$FALLBACK_LOGO" ]; then
    info "No assets/ source found — bootstrapping from $FALLBACK_LOGO"
    mkdir -p assets
    cp "$FALLBACK_LOGO" "assets/icon.png"
    ASSET_SRC="assets"
    ok "Created assets/icon.png (consider replacing with a ≥1024×1024 version for best quality)"
  else
    warn "No icon source found and no fallback logo at $FALLBACK_LOGO."
    warn "Skipping icon generation — default Capacitor icons will be used."
    warn "To fix: place a logo at assets/icon.png (≥1024×1024 recommended)."
  fi
fi

if [ -n "$ASSET_SRC" ]; then
  ok "Asset source: $ASSET_SRC"
  if command -v pnpm >/dev/null 2>&1; then
    ASSETS_CMD=(pnpm exec capacitor-assets)
  else
    ASSETS_CMD=(npx @capacitor/assets)
  fi
  if "${ASSETS_CMD[@]}" generate --android \
        --assetPath "$ASSET_SRC" \
        --iconBackgroundColor "$ICON_BG" \
        --iconBackgroundColorDark "$ICON_BG_DARK" \
        --splashBackgroundColor "$SPLASH_BG" \
        --splashBackgroundColorDark "$SPLASH_BG_DARK"; then
    ok "Icons & splash generated → android/app/src/main/res"
  else
    warn "@capacitor/assets failed; continuing with existing icons."
    warn "If the image is too small, use a ≥1024×1024 source at assets/icon.png."
  fi
fi

# --- 6/6 — APK build (+ install for debug) -----------------------------------

echo "==> [6/6] Building the APK ($BUILD_TYPE)"
cd android

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease || die "Gradle release build failed."
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  cd ..
  ok "Release APK ready: android/$APK_PATH"
  echo "    Sign it with apksigner before distributing."
  exit 0
fi

./gradlew assembleDebug || die "Gradle debug build failed."
cd ..
# APK path is relative to the repo root (consistent for adb + messages).
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK_PATH" ] || die "Build reported success but APK not found at: $APK_PATH"

# Install only if adb is available and a device is authorized.
if ! require_cmd adb; then
  warn "adb not available on PATH. Debug APK ready at: $APK_PATH"
  exit 0
fi
adb start-server >/dev/null 2>&1 || true
if ! device_authorized; then
  warn "No authorized device detected (adb devices shows none with state 'device')."
  warn "Connect a phone via USB, enable USB debugging, then tap 'Allow' on the"
  warn "RSA-key dialog that appears on the phone. Then re-run this script or:"
  warn "    adb install -r $APK_PATH"
  warn "Debug APK is ready at: $APK_PATH"
  exit 0
fi

info "Installing debug APK on connected device…"
adb install -r "$APK_PATH"
ok "Done! Launch 'astolfy' on your phone."