# Meta (Facebook / Instagram) Ads setup

The Meta SDK is wired into the iOS app but **ships dormant**. Nothing is sent to Meta, and the
App Tracking Transparency (ATT) prompt is not shown, until you finish the steps below and set
`VITE_META_ADS_ENABLED=true`.

## What is already in the repo

| Piece | Where |
|-------|-------|
| Meta App Events plugin (`@capgo/capacitor-facebook-analytics`, wraps the official Facebook iOS SDK 18.x) | `package.json`, `ios/App/CapApp-SPM/Package.swift` |
| ATT prompt plugin (`@capgo/capacitor-app-tracking-transparency`) | same |
| Meta keys, `NSUserTrackingUsageDescription`, `SKAdNetworkItems` (Meta's two IDs), `fb<APP_ID>` URL scheme | `ios/App/App/Info.plist` |
| SDK auto-start **disabled** so nothing runs before the ATT prompt | `FacebookAutoInitEnabled` / `FacebookAutoLogAppEventsEnabled` = `false` |
| Startup + event helpers (feature flag, ATT, init, events) | `src/lib/metaAds.ts` |
| Unit tests | `src/test/metaAds.test.ts` |
| Privacy Policy updated to disclose Meta | `src/pages/Privacy.tsx` |

### Flow at runtime (iOS app only)

1. App launches. About 1.5 s later the ATT dialog is shown (first launch only).
2. Allowed: IDFA collection is enabled. Denied: IDFA is **not** collected, but the SDK still starts and
   reports aggregated, SKAdNetwork-attributed events (this is allowed and is how most installs are measured now).
3. `initAppEvents()` starts the SDK. Meta logs the install / app-open automatically.

### Events sent (no health data, ever)

| Meta event | When | Code |
|------------|------|------|
| `fb_mobile_complete_registration` (param: method) | First sign-in of a brand-new account (account younger than 10 min, once per user) | `AuthSync.tsx` |
| `fb_mobile_tutorial_completion` | Onboarding "Analyzing" screen finishes | `Analyzing.tsx` |
| `fb_mobile_initiated_checkout` | User taps Subscribe on the paywall | `useSubscription.tsx` |
| `fb_mobile_purchase` (value + currency from the App Store price) | Purchase succeeds and the Pro entitlement is active | `useSubscription.tsx` |

Restores and reviewer-bypass accounts do not log purchases.

> If you later turn on RevenueCat's own **Meta integration** (server-side Conversions API),
> remove `trackSubscriptionPurchased` so purchases are not counted twice.

## What YOU need to do

### 1. Meta developer app (developers.facebook.com)

1. **My Apps → Create App** → use case "Other" → type **Business**. Name it `RatioAi`.
2. **App settings → Basic**:
   - Copy the **App ID**.
   - **Add Platform → iOS**: Bundle ID `com.ratioai.ios`, iPhone Store ID `6787262904`
     (your App Store Connect Apple ID, also used in `codemagic.yaml`).
   - Add Privacy Policy URL `https://ratioai.vercel.app/privacy` and your app icon, set category (Health & Fitness).
3. **App settings → Advanced**: copy the **Client Token**.
4. Switch the app to **Live** mode (toggle at the top) once the above is filled in.

### 2. Business Manager (business.facebook.com)

1. Business settings → **Accounts → Apps → Add** your app (by App ID).
2. Business settings → **Accounts → Ad accounts**: assign the ad account to the app, and make sure your
   Facebook user has full control.
3. Complete **business verification** and add a payment method on the ad account (needed to run ads).

### 3. Put the keys in the app

Edit `ios/App/App/Info.plist` and replace the 3 placeholders (search for `REPLACE-WITH`):

| Key | Value |
|-----|-------|
| `FacebookAppID` | your App ID (e.g. `1234567890123456`) |
| `FacebookClientToken` | your Client Token |
| URL scheme `fbREPLACE-WITH-FACEBOOK-APP-ID` | `fb` + App ID, e.g. `fb1234567890123456` |

`FacebookDisplayName` is already `RatioAi`.

### 4. Turn the feature on

Add `VITE_META_ADS_ENABLED=true` to the Codemagic **`ratioai_env`** variable group (and your local `.env`
to test locally). Without it the app behaves exactly as before. Push to `main` to build.

### 5. App Store Connect

**App Privacy** (must match the app or you risk another 5.1.2 rejection). Replace the "no tracking" answers:

| Data type | Linked to user | Used for tracking | Purpose |
|-----------|----------------|-------------------|---------|
| Identifiers → **Device ID** | Yes | **Yes** | Third-Party Advertising, Analytics |
| Purchases → **Purchase History** | Yes | **Yes** | Third-Party Advertising, App Functionality |
| Usage Data → **Product Interaction** | Yes | **Yes** | Third-Party Advertising, Analytics |

Keep the existing Email, Photos, Health & Fitness rows as App Functionality only, **not** tracking.
Answer "Yes" to "Do you or your third-party partners use data to track users?"

**App Review notes**: mention that the app asks for App Tracking Transparency permission on first launch and
works fully if the user taps "Ask App Not to Track".

Publish the web build (Vercel) so `/privacy` shows the updated policy before submitting.

### 6. Verify events reach Meta

1. Install the TestFlight build on a device and accept the ATT prompt.
2. Meta **Events Manager → Data sources → your app → Test events**: enter the device's Advertising ID
   (Settings app → Privacy & Security → Tracking must be allowed for RatioAi) and run through sign-up and the paywall.
3. You should see activate-app, registration, tutorial completion, initiated checkout, and (sandbox) purchase.

### 7. Configure Aggregated Event Measurement (iOS 14+)

Events Manager → **Aggregated Event Measurement → Configure Web Events/App Events** and rank up to 8 events.
Suggested priority: 1. Purchase, 2. Initiated Checkout, 3. Complete Registration, 4. Tutorial Completion.
Meta only optimizes toward events it has seen, so complete step 6 first.

### 8. Create the campaign

Ads Manager → **Create → App promotion** → iOS app (search by your App Store listing; the app must be live
or you can use the App Store URL once approved). Start by optimizing for **App installs**, then switch to
**Purchase (value)** once you reach roughly 50 purchases per week.

## Notes and limits

- **Android** is not configured (no `android/` project in the repo). Add the Meta keys to `AndroidManifest.xml`
  and `strings.xml` if you add it later.
- **Web pixel** is not included: this setup targets app-install ads. If you also send traffic to a web
  landing page, add the Meta Pixel separately.
- **Local builds**: this environment is Linux, so the native iOS build could not be compiled here. The Swift
  package manifest is generated by `npx cap sync ios`; Codemagic runs that on every build.
- Meta's UI changes often; if a menu name differs, search Meta's docs for "iOS app events" and
  "Aggregated Event Measurement".
