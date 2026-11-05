#!/usr/bin/env bash
# Local store-release pipeline (no EAS). Usage:
#   scripts/release.sh bump 1.1.6 [116]   # version + build in app.json and the generated natives
#   scripts/release.sh android             # signed AAB → dist/<version>/app-release.aab
#   scripts/release.sh ios                 # archive + App Store IPA → dist/<version>/TronDealer.ipa
#   scripts/release.sh upload:ios          # altool with an App Store Connect API key
#   scripts/release.sh upload:android      # Play Developer API with a service account
#   scripts/release.sh all                 # android + ios + both uploads
#
# Secrets come from .env.release (gitignored), see .env.release.example.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.release ] && set -a && . ./.env.release && set +a

APP_JSON=app.json
VERSION=$(node -p "require('./$APP_JSON').expo.version")
BUILD=$(node -p "require('./$APP_JSON').expo.ios.buildNumber")
TEAM_ID=${ASC_TEAM_ID:-CN9WDS6BJW}
DIST="dist/$VERSION"
mkdir -p "$DIST"

log() { printf '\n\033[1m› %s\033[0m\n' "$*"; }

need_native() {
	[ -d ios ] && [ -d android ] || { echo "ios/ or android/ missing — run 'npx expo prebuild' (NOT --clean: the upload keystore lives in android/app/)"; exit 1; }
}

bump() {
	local v=$1 b=${2:-}
	[ -n "$v" ] || { echo "usage: release.sh bump <version> [build]"; exit 1; }
	[ -n "$b" ] || b=$(echo "$v" | tr -d .)   # 1.1.6 → 116
	node - "$v" "$b" <<'EOF'
const fs = require('fs'); const [v, b] = process.argv.slice(2)
const j = JSON.parse(fs.readFileSync('app.json', 'utf8'))
j.expo.version = v; j.expo.ios.buildNumber = String(b); j.expo.android.versionCode = Number(b)
fs.writeFileSync('app.json', JSON.stringify(j, null, '\t'))   // tabs, no trailing newline: matches the committed formatting
const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); p.version = v
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n')
const sub = (f, pairs) => { if (!fs.existsSync(f)) return; let s = fs.readFileSync(f, 'utf8'); for (const [re, to] of pairs) s = s.replace(re, to); fs.writeFileSync(f, s) }
sub('android/app/build.gradle', [[/versionCode \d+/, `versionCode ${b}`], [/versionName "[^"]+"/, `versionName "${v}"`]])
sub('ios/TronDealer.xcodeproj/project.pbxproj', [[/CURRENT_PROJECT_VERSION = [\d.]+;/g, `CURRENT_PROJECT_VERSION = ${b};`], [/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${v};`]])
for (const f of ['ios/TronDealer/Info.plist', 'ios/OneSignalNotificationServiceExtension/OneSignalNotificationServiceExtension-Info.plist'])
	sub(f, [[/(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+/, `$1${v}`], [/(<key>CFBundleVersion<\/key>\s*<string>)[^<]+/, `$1${b}`]])
console.log(`bumped to ${v} (${b})`)
EOF
}

android() {
	need_native
	[ -f android/keystore.properties ] || { echo "android/keystore.properties missing (upload keystore) — restore it from your private backup"; exit 1; }
	log "Android: bundleRelease $VERSION ($BUILD)"
	(cd android && ./gradlew bundleRelease --no-daemon -q)
	cp android/app/build/outputs/bundle/release/app-release.aab "$DIST/"
	keytool -printcert -jarfile "$DIST/app-release.aab" | grep SHA256
	echo "→ $DIST/app-release.aab"
}

ios() {
	need_native
	log "iOS: archive $VERSION ($BUILD)"
	cat > "$DIST/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>teamID</key><string>$TEAM_ID</string>
<key>signingStyle</key><string>automatic</string>
<key>uploadSymbols</key><true/>
<key>destination</key><string>export</string>
</dict></plist>
EOF
	xcodebuild -workspace ios/TronDealer.xcworkspace -scheme TronDealer -configuration Release \
		-destination 'generic/platform=iOS' -archivePath "$DIST/TronDealer.xcarchive" archive \
		-allowProvisioningUpdates -quiet
	log "iOS: export IPA"
	xcodebuild -exportArchive -archivePath "$DIST/TronDealer.xcarchive" \
		-exportOptionsPlist "$DIST/ExportOptions.plist" -exportPath "$DIST/ios-export" -allowProvisioningUpdates -quiet
	cp "$DIST/ios-export/TronDealer.ipa" "$DIST/"
	echo "→ $DIST/TronDealer.ipa"
}

upload_ios() {
	: "${ASC_KEY_ID:?set ASC_KEY_ID (App Store Connect API key id)}"
	: "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}"
	: "${ASC_KEY_PATH:?set ASC_KEY_PATH (AuthKey_XXXX.p8)}"
	# altool looks for the .p8 in ~/.appstoreconnect/private_keys/
	mkdir -p ~/.appstoreconnect/private_keys
	cp -n "$ASC_KEY_PATH" ~/.appstoreconnect/private_keys/ 2>/dev/null || true
	log "iOS: upload $DIST/TronDealer.ipa to App Store Connect"
	xcrun altool --upload-app -f "$DIST/TronDealer.ipa" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
	echo "→ build $BUILD is processing; attach it to $VERSION in App Store Connect (or use 'release.sh submit:ios' once automated)"
}

upload_android() {
	: "${PLAY_SERVICE_ACCOUNT_JSON:?set PLAY_SERVICE_ACCOUNT_JSON (path to the Play Console service-account key)}"
	log "Android: upload $DIST/app-release.aab to Play (${PLAY_TRACK:-production})"
	node scripts/play-upload.mjs "$DIST/app-release.aab" "${PLAY_TRACK:-production}"
}

case "${1:-}" in
	bump) bump "${2:-}" "${3:-}" ;;
	android) android ;;
	ios) ios ;;
	upload:ios) upload_ios ;;
	upload:android) upload_android ;;
	all) android; ios; upload_android; upload_ios ;;
	*) sed -n 2,10p "$0"; exit 1 ;;
esac
