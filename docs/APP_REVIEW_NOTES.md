# App Store Review Notes — RatioAi

Use these notes in **App Store Connect → App Review Information**, and update **App Privacy** to match.

## Demo mode (Guideline 2.1)

| Field | Value |
|--------|--------|
| Email | `reviewer@ratioai.app` |
| Password | `1234` |

**These credentials now work with no setup on your side.** They are not a Supabase
account — entering them switches the app into a built-in demonstration mode that
runs entirely on the device. Nothing to provision, nothing to expire, no network
required, and the Pro paywall is unlocked.

Reviewers who do not use the credentials can also tap **“Explore demo — no account
needed”**, which is on both the welcome screen and the sign-in screen.

Demo mode seeds a profile and a week of meals, so Today, History, Insights and
Profile all have content immediately. If the meal AI service is unreachable, photo
and voice logging fall back to a clearly labelled sample analysis so the reviewer
can still walk the whole flow.

**Paste into Review Notes:**

```
Demo account
Email: reviewer@ratioai.app
Password: 1234

These credentials open a built-in demonstration mode with all features unlocked,
including Pro. Enter them on the Sign In screen (email + password, then
"Sign in with password"). You can also tap "Explore demo — no account needed" on
the welcome or sign-in screen.

Support URL: https://ratioai.vercel.app/support
Privacy Policy: https://ratioai.vercel.app/privacy
```

> Do not change `DEMO_EMAIL` / `DEMO_PASSWORD` in `src/lib/demoMode.ts` without
> updating App Store Connect to match.

## App Privacy Nutrition Labels (Guideline 5.1.2)

Your previous labels only listed Name, Email, Payment Info — all marked **Used for Tracking**. That does **not** match the app.

### Uncheck Tracking for everything

RatioAi does not use ATT/IDFA or ad networks. **Do not** mark Name, Email, or Purchases as “Used for Tracking.”

### Declare these data types (linked to identity, App Functionality)

| Data type | Why |
|-----------|-----|
| **Contact Info → Email Address** (and Name if collected) | Account / sign-in |
| **Photos or Videos** | Meal photos for AI analysis |
| **Health & Fitness → Other Health Data / Fitness** | Body metrics: height, weight, age, gender, activity, goals |
| **Purchases → Purchase History** | Apple IAP + RevenueCat (not full card numbers) |

### Do **not** declare

- **Tracking** (no cross-app tracking)
- **Payment Info / Credit Card** as if you store card numbers (use **Purchase History**)
- **Continuous glucose / CGM** — this build does **not** collect CGM or blood-glucose device readings. Body metrics and any free-text notes are covered under Health & Fitness / user content. The Privacy Policy states this explicitly and includes a medical disclaimer.

Privacy Policy URL (must be public, no login):  
`https://ratioai.vercel.app/privacy`

## What we fixed in code

### 2.1 App Completeness

- Built-in demo mode (`src/lib/demoMode.ts`) — the published credentials work with no backend
- Pro paywall bypass for demo mode and for `reviewer@ratioai.app`
- `/waitlist` redirects to the real welcome/onboarding flow (no “almost here” dead end)
- Softened overclaims (removed “200+ Cuisines” / USDA badge)

### 2.1(a) Sign in with Apple returned to the login screen (iPad)

`ASAuthorization` reports error code 1001 (`canceled`) both when the user dismisses
the sheet **and** when the sheet never manages to present — which is the iPad case.
The app treated that as a deliberate cancel and silently stayed on the sign-in
screen, exactly the behaviour Apple reported.

Fixes in `src/lib/auth.ts` and `src/pages/app/NativeAuthBridge.tsx`:

- A cancel that arrives faster than a human could tap is treated as a failure and
  falls back to the browser OAuth flow.
- Cancels and failures now show a reason on screen instead of nothing.
- The hosted bridge retries the custom-scheme handoff (Safari blocks scheme
  navigation without a user gesture), retries on refocus, and shows a large
  **Open RatioAi** button.
- If the in-app browser closes without producing a session, the sign-in screen says
  so and points at demo mode.

### 2.1(b) In-App Purchases not submitted

This one is resolved in App Store Connect, not in code — see the checklist below.
In the meantime the app no longer traps users behind an empty paywall: if the store
returns no purchasable packages, `RequireSubscription` lets them through and the
paywall shows a **Continue to RatioAi** button.

### 2.5.1 Software Requirements

- Meal AI client: 55s timeout, offline check, user-safe errors (no “redeploy Vercel / API key” strings)
- Removed unused HealthKit / Apple Health connect UI and usage strings

### 5.1.2 Privacy

- Rewrote Privacy Policy: photos, body metrics (health-related fitness), glucose clarification, purchase history, third parties (OpenAI, Supabase, RevenueCat/Apple), no tracking, deletion
- In-app `MedicalDisclaimer` on Welcome, onboarding, Today, Profile, Support, Terms
- Stopped syncing meal photo binaries to cloud (nutrition metadata only)
- Account delete clears this device’s `app_sessions` when `client_id` is sent

## In-App Purchases — submit them with the build (Guideline 2.1(b))

Apple cannot approve a build that advertises subscriptions when the products
themselves were never submitted. Nothing in the code can fix this; it has to be
done in App Store Connect.

For **each** product (`ratioai_pro_monthly`, `ratioai_pro_yearly`):

1. **Monetization → Subscriptions** → your subscription group → open the product.
2. Status must be **Ready to Submit** (not *Missing Metadata*). Fill in:
   - Subscription duration and price for all territories
   - **Localization**: display name + description (at least English)
   - **Review information → App Review screenshot** — this is required, and its
     absence is the usual reason a product stays in *Missing Metadata*. A screenshot
     of the in-app paywall (`/app/paywall`) is what they want.
   - Review notes: mention that demo mode unlocks Pro without purchasing.
3. Confirm the **Paid Applications Agreement** is active in Business → Agreements,
   otherwise products never become purchasable and the paywall will be empty.
4. In your app version page, scroll to **In-App Purchases and Subscriptions** and
   **add both products to the version**. This is the step that actually submits
   them alongside the binary — leaving it out reproduces this exact rejection.
5. Make sure the RevenueCat offering marked **current** contains both products, and
   that the entitlement is named `pro` (or set `VITE_REVENUECAT_ENTITLEMENT_ID`).

## After merge — your checklist

1. Fix App Privacy Nutrition Labels as above; redeploy so `/privacy` is live.
2. Confirm `OPENAI_API_KEY` on Vercel (meal scan works during review).
3. Attach both In-App Purchase products to the version and add the App Review
   screenshot for each (see above).
4. Redeploy `delete-account` edge function; `npm run cap:sync` and ship a new iOS build.
5. Paste the Review Notes above, with `reviewer@ratioai.app` / `1234`, into App
   Store Connect.
6. Optional but worth doing: fix Apple sign-in at the source so the browser
   fallback is never needed — in Supabase → Authentication → Providers → Apple, add
   `com.ratioai.ios` to **Authorized Client IDs**, and confirm the Services ID and
   return URL are configured in the Apple Developer portal.

## HealthKit / CareKit (Guideline 2.5.1 — transparency)

Apple flagged that the binary linked HealthKit APIs without clear in-app HealthKit UI.

**Resolution in this codebase:** RatioAi does **not** use Apple Health / HealthKit / CareKit for any product feature. We removed the leftover `capacitor-health` native link from `ios/App/CapApp-SPM/Package.swift` so the App Store binary no longer includes HealthKit. There is no Health connect control in Profile or elsewhere because the feature does not exist.

Do **not** enable the HealthKit capability in Xcode for RatioAi unless you later ship a real Apple Health integration with clear UI labeling (e.g. “Connect Apple Health (HealthKit) to import steps”).

