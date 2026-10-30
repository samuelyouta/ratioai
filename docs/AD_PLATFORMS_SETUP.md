# TikTok Ads and Apple Ads setup (plus the all-platform checklist)

Like Meta (see `META_ADS_SETUP.md`), both integrations ship **dormant**. Nothing is sent and no SDK starts
until you do the steps below and set the matching `VITE_*` flags in Codemagic.

| Platform | What it does | Needs ATT prompt? | Flag |
|----------|--------------|-------------------|------|
| Meta (Facebook / Instagram) | App Events SDK | Yes | `VITE_META_ADS_ENABLED` |
| TikTok | TikTok App Events SDK (installs, sign-up, onboarding, checkout, purchase) | Yes (shared prompt) | `VITE_TIKTOK_ADS_ENABLED` + 2 ids |
| Apple Ads (Search Ads) | AdServices attribution token, resolved by RevenueCat | **No** | `VITE_APPLE_ADS_ENABLED` |

All three go through one place in the app, `src/lib/adEvents.ts`, so the funnel is identical everywhere:

| Funnel step | Meta event | TikTok event | Where it fires |
|-------------|-----------|--------------|----------------|
| Install / app open | automatic | automatic (`InstallApp`, `LaunchAPP`, 2-day retention) | SDK start |
| New account created | `CompleteRegistration` | `Registration` | `AuthSync.tsx` |
| Onboarding finished | `CompleteTutorial` | `CompleteTutorial` | `Analyzing.tsx` |
| Subscribe tapped | `InitiateCheckout` | `Checkout` | `useSubscription.tsx` |
| Subscription active | `Purchase` (value + currency) | `Purchase` (value + currency) | `useSubscription.tsx` |

Never add health data (meals, photos, weight, goals, name, email) to any event.

## What is already in the repo

- `plugins/capacitor-tiktok-events/`: a small local Capacitor plugin (Swift) wrapping the official
  [TikTok App Events SDK](https://github.com/tiktok/tiktok-business-ios-sdk) 1.7.2 through Swift Package Manager.
  Automatic payment tracking is turned off so a purchase is reported once, with RevenueCat's price.
  `npx cap sync ios` (already in `codemagic.yaml`) links it into `ios/App/CapApp-SPM/Package.swift`.
- `src/lib/tiktokAds.ts`, `src/lib/appleAds.ts`, `src/lib/adEvents.ts`, `src/lib/attPrompt.ts`
  (one shared App Tracking Transparency prompt for every SDK).
- `Info.plist`: TikTok SKAdNetwork ids (`238da6jt44`, `22mmun2rn5`) next to Meta's.
- Privacy Policy now names TikTok and Apple Ads.
- Tests: `src/test/adPlatforms.test.ts`.

## A. TikTok

### 1. Create the app in TikTok Events Manager
1. [TikTok Ads Manager](https://ads.tiktok.com) → create/sign in to your ad account (add a payment method).
2. **Tools → Events → App events → Manage → Set up app events** (menu names change; search the TikTok help
   center for "set up app events SDK").
3. Choose **iOS**, enter the App Store URL / ID **6787262904** and bundle id `com.ratioai.ios`.
4. When asked how to connect, pick **TikTok App Events SDK** (not a third-party MMP).
5. Copy two values from the app's settings page:
   - **TikTok App ID** (a long number, called "TikTok App ID" / "App ID")
   - **App Events SDK access token** (generate one if none exists)

### 2. Turn it on
Add to the Codemagic **`ratioai_env`** group (and your local `.env` to test):

```
VITE_TIKTOK_ADS_ENABLED=true
VITE_TIKTOK_APP_ID=<TikTok App ID>
VITE_TIKTOK_ACCESS_TOKEN=<App Events SDK access token>
```

`VITE_TIKTOK_APP_STORE_ID` defaults to `6787262904`; only set it if that changes.
Set `VITE_TIKTOK_DEBUG=true` on a TestFlight build to get verbose native logs while testing, then remove it.
Push to `main` to build. The access token ships inside the app by design (TikTok's SDK requires it); it can only
send events for this app and can be rotated in Events Manager.

### 3. Verify
1. Install the TestFlight build, accept the ATT prompt, create an account, finish onboarding, open the paywall.
2. Events Manager → your app → **Test events** (or the events table): look for `Registration`,
   `CompleteTutorial`, `Checkout`, and a sandbox `Purchase`.
3. Install/launch events can take a while to appear; events from TestFlight/sandbox are not real conversions.

### 4. Campaign
Ads Manager → **App promotion** → iOS → your app. Start optimizing for **App installs**; once you have enough
purchases, optimize for the **Purchase** event / value. SKAdNetwork (SKAN) is handled by the SDK.

## B. Apple Ads (formerly Apple Search Ads)

Apple reports installs through its own AdServices framework, so there is **no extra prompt and no IDFA**.

### 1. Apple Ads account
1. [ads.apple.com](https://ads.apple.com) → create an Apple Ads account (Advanced), add a payment method.
2. Create a **Search Results** campaign for the RatioAi app (App Store ID 6787262904). Typical split:
   brand keywords, competitor keywords, and a Search Match "discovery" ad group.
3. Optional: in App Store Connect create **Custom Product Pages** for different keyword themes and use them
   in the ad groups.

### 2. Turn it on
Add `VITE_APPLE_ADS_ENABLED=true` to the Codemagic `ratioai_env` group and push to `main`.
After RevenueCat starts, the app asks it to collect the AdServices token (`src/lib/appleAds.ts`).

### 3. RevenueCat
RevenueCat dashboard → your project → **Integrations → Apple Search Ads** → enable it (and, if you want keyword-level
names, authorize your Apple Ads account there). Campaign / ad group / keyword then appears on each customer and in
revenue charts for users who installed from an Apple ad.

Apple only issues an attribution token for installs that really came from an ad, so you will not see attribution
for your own test installs; check RevenueCat after the first real ad installs.

## C. App Store Connect checklist (all platforms)

**App Privacy** must say the app tracks users (same answers as the Meta doc, now also covering TikTok):

| Data type | Linked | Used for tracking | Purpose |
|-----------|--------|-------------------|---------|
| Identifiers → Device ID | Yes | Yes | Third-Party Advertising, Analytics |
| Purchases → Purchase History | Yes | Yes | Third-Party Advertising, App Functionality |
| Usage Data → Product Interaction | Yes | Yes | Third-Party Advertising, Analytics |

Keep Email, Photos, Health & Fitness as App Functionality only. Apple Ads attribution alone does not count as tracking.
Mention in the App Review notes that the app asks for ATT on first launch and works fully if the user declines.
Publish the web build first so `/privacy` shows the updated policy.

## D. Before spending money on ads on every platform

1. Meta, TikTok and Apple IDs/flags are all set in Codemagic, and a TestFlight build has shown events in each dashboard.
2. If you later enable RevenueCat's server-side integrations for Meta or TikTok, remove the in-app `Purchase`
   sends for that platform (`trackSubscriptionPurchased`) so purchases are not counted twice.
3. Use a different campaign name / UTM per platform; compare cost per registration and per subscription in each
   dashboard, and RevenueCat for the real revenue.
4. Android is not set up (there is no `android/` project in the repo).

## Limits

- The native iOS build cannot be compiled in this repo's Linux environment. The Swift plugin was written against the
  SDK's public headers and sample app; the first Codemagic build is the real compile check.
- TikTok and Apple menu names change often; if a menu differs, search their docs for the terms above.
