# iOS build on Mac

Open the native project in Xcode after syncing web assets:

```bash
npm run cap:sync
npm run ios:assets    # regenerate icon + splash + screenshot frames
npx cap open ios
```

## First-time Xcode checklist

1. **Signing** — select your Team under Signing & Capabilities for the `App` target.
2. **Bundle ID** — must match App Store Connect (`app.lovable.c9c7af010da54a22a51eb40ca37bcbd2` or your custom ID).
3. **Capabilities** — enable Push Notifications and HealthKit if using those features.
4. **In-App Purchases** — add the StoreKit capability for RevenueCat subscriptions.

## RevenueCat (native iOS)

RevenueCat is configured in **AppDelegate** on launch (Capacitor UIKit app — not SwiftUI `@main`):

- API key: `ios/App/App/Info.plist` → `RevenueCatAPIKey`
- Bootstrap: `ios/App/CapApp-SPM/Sources/CapApp-SPM/CapApp-SPM.swift`
- JS paywall: `@revenuecat/purchases-capacitor` via `src/lib/subscriptions.ts`

Replace the test key with your production `appl_...` key before App Store release.

## Info.plist privacy strings

Configured in `ios/App/App/Info.plist`:

| Key | Purpose |
|-----|---------|
| `NSCameraUsageDescription` | Meal photo analysis |
| `NSMicrophoneUsageDescription` | Voice meal descriptions |
| `NSPhotoLibraryUsageDescription` | Pick photos from library |
| `NSHealthShareUsageDescription` | Read steps / activity |
| `UIBackgroundModes` | Push notifications |

## Icons & splash

Generated from `src/assets/logo.jpg` via `scripts/generate-ios-assets.sh`:

- App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash: `ios/App/App/Assets.xcassets/Splash.imageset/`

Re-run after logo changes:

```bash
npm run ios:assets
```

## App Store screenshots

Pre-sized frames (1290×2796, iPhone 6.7") are in `ios/AppStore/screenshots/`.

Upload in App Store Connect → your app → Screenshots. Replace with final marketing captures from a real device or simulator if needed.

## Live reload (dev only)

```bash
npm run dev
CAPACITOR_DEV_SERVER=http://YOUR_MAC_LAN_IP:8080 npx cap run ios
```

Production builds omit `server.url` and load bundled `dist/` assets.

## Deploy edge functions

After pulling account-deletion / rate-limit changes:

```bash
supabase functions deploy delete-account
supabase db push   # applies edge_rate_limits migration
```
