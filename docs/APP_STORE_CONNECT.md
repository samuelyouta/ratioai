# App Store Connect & RevenueCat Setup

Configure these before shipping the iOS app with in-app subscriptions.

## 1. App Store Connect — create subscription group

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your app → **Subscriptions**.
2. Create a subscription group (e.g. **RatioAi Pro**).
3. Add two **Auto-Renewable Subscriptions**:

| Product ID | Duration | Suggested name |
|------------|----------|----------------|
| `ratioai_pro_monthly` | 1 month | RatioAi Pro Monthly |
| `ratioai_pro_yearly` | 1 year | RatioAi Pro Yearly |

4. Set pricing, localizations, and review screenshot for each product.
5. On the **yearly** product, add an **Introductory Offer** that is a free trial (for example 3 days). The paywall starts that trial when the yearly plan is selected. The monthly plan is a regular subscription.
6. Submit the products for review with your app binary. A group left on "Prepare for Submission" does not return prices to the app.

Product IDs must match `.env` (or defaults in `src/lib/subscriptions.ts`).

## 2. RevenueCat dashboard

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com).
2. Add your **iOS app** with the App Store Connect shared secret / App Store Connect API key.
3. **Entitlements** → create entitlement identifier: `pro`
4. **Products** → import `ratioai_pro_monthly` and `ratioai_pro_yearly` from App Store Connect.
5. Attach both products to the `pro` entitlement.
6. **Offerings** → create offering `default` (mark as **Current**):
   - Package `$rc_monthly` → `ratioai_pro_monthly`
   - Package `$rc_annual` → `ratioai_pro_yearly`

## 3. Environment variables

Add to `.env` (and Xcode/Android build env for native):

```bash
VITE_REVENUECAT_IOS_API_KEY=appl_xxxxxxxx
VITE_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxx   # when shipping Android
VITE_REVENUECAT_ENTITLEMENT_ID=pro
VITE_REVENUECAT_PRODUCT_MONTHLY=ratioai_pro_monthly
VITE_REVENUECAT_PRODUCT_YEARLY=ratioai_pro_yearly
```

Optional:

```bash
# Require subscription on web (default: web bypasses, native always requires it)
VITE_SUBSCRIPTION_REQUIRED_WEB=false
```

iOS builds always show the trial funnel. `VITE_SUBSCRIPTION_BYPASS` does not turn it off.

## 4. Build & run native app

Production builds use bundled `dist/` assets (no remote `server.url`):

```bash
npm run cap:sync      # build web + sync to iOS/Android
npx cap open ios      # archive in Xcode
```

Live-reload dev against a local server:

```bash
npm run dev
CAPACITOR_DEV_SERVER=http://localhost:8080 npx cap run ios
```

## 5. User flow

```
Onboarding → Sign in (Apple / Google / Email) → Try for free → Trial reminder → Paywall → App
```

- After sign-in, iOS opens `/app/trial` ("RatioAi wants you to try it for free"), then `/app/trial/reminder` (asks for notification permission and schedules a local reminder before the trial ends), then the paywall.
- The yearly plan's button starts the free trial. The monthly plan subscribes immediately.
- **RequireSubscription** blocks meal logging until the `pro` entitlement is active, including when the App Store has not returned products yet.
- The App Review account `reviewer@ratioai.app` still skips the paywall.
- Purchases are linked to the Supabase user ID via `Purchases.logIn`.
- **Restore Purchases** is available on the paywall and Profile screen.

## 6. App Store support URL

Use this public page for App Store Connect → App Information → **Support URL**:

`https://ratioai.vercel.app/support`

It includes contact email (`support@ratioai.app`), FAQ, and links to Privacy / Terms.
