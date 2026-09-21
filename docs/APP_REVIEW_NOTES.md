# App Store Review Notes — RatioAi

Use these notes in **App Store Connect → App Review Information**, and update **App Privacy** to match.

## Demo account (Guideline 2.1)

The reviewer signs in with a **real Supabase account**. You must create it before
submitting — see [Supabase setup](#supabase-setup--required-before-submitting).

| Field | Value |
|--------|--------|
| Email | `reviewer@ratioai.app` |
| Password | you choose — **must be at least 6 characters** |

> ### The password `1234` cannot work
>
> Supabase enforces a minimum password length of 6 characters and will not let you
> create an account with `1234`. That is why App Review could not sign in. Pick a
> password of 6 or more characters, set it in Supabase, and put the same value in
> App Store Connect.

This account skips the Pro paywall in-app (`src/lib/reviewerAccess.ts` matches the
email), so the reviewer sees every feature without purchasing.

**Paste into Review Notes** (substitute your real password):

```
Demo account
Email: reviewer@ratioai.app
Password: <YOUR_REVIEWER_PASSWORD>

How to sign in:
1. Launch the app and tap "I already have an account" on the welcome screen.
2. Enter the email and password above. The button becomes "Sign in" as soon as a
   password is typed.
3. First launch will ask a few onboarding questions to build the macro targets.
   After that the full app opens; this account has Pro unlocked, so no purchase
   is required.

Support URL: https://ratioai.vercel.app/support
Privacy Policy: https://ratioai.vercel.app/privacy
```

## Supabase setup — required before submitting

Without these steps the reviewer cannot sign in, and the submission will be
rejected again under 2.1.

### 1. Enable email + password sign-in

1. Supabase dashboard → your project → **Authentication → Sign In / Providers**.
2. Open **Email**. Make sure the provider is **enabled** and **"Enable password
   sign-in"** (sometimes shown as *Allow email/password*) is on.
3. Note **Minimum password length** — the floor is 6. Your reviewer password must
   meet it.

### 2. Create the reviewer user

1. **Authentication → Users → Add user → Create new user**.
2. Email: `reviewer@ratioai.app`
3. Password: your chosen password, **6+ characters**.
4. Tick **Auto Confirm User**. If you skip this, the account has no confirmed
   email and sign-in fails with "Email not confirmed".
5. Save, and confirm the user appears in the list with a confirmation timestamp.

### 3. Verify it before you submit

Open `https://ratioai.vercel.app/app/signin` in a private browser window, enter the
two values, and confirm you get into the app. If that fails, the reviewer's attempt
will fail the same way. Common causes:

| Symptom | Cause |
|---------|-------|
| "That email and password combination was not recognised" | Wrong password, or the user was never created |
| "This account still needs its email confirmed" | *Auto Confirm User* was not ticked |
| "Could not reach the server" | Wrong `VITE_SUPABASE_URL` / publishable key in the build |

### 4. Apple sign-in (only if you want the Apple button to work)

Native Sign in with Apple is already wired up on the iOS side: the
`com.apple.developer.applesignin` entitlement is in `ios/App/App/App.entitlements`
and the `com.ratioai.ios` URL scheme is in `Info.plist`. What the **server** needs:

1. Apple Developer → **Certificates, Identifiers & Profiles → Identifiers** → the
   `com.ratioai.ios` App ID → enable the **Sign in with Apple** capability.
2. Supabase → **Authentication → Sign In / Providers → Apple** → enable it.
3. In that same panel, add `com.ratioai.ios` to **Authorized Client IDs**. This is
   what lets the native, in-app Apple sheet work. Without it Supabase rejects the
   Apple ID token with *"Unacceptable audience in id_token"* and the app has to
   fall back to the slower browser flow.
4. For the browser fallback, also fill in the **Services ID**, **Team ID**, **Key
   ID** and **private key** from the Apple Developer portal, and add
   `https://<your-project>.supabase.co/auth/v1/callback` as the Apple **Return
   URL**.
5. Supabase → **Authentication → URL Configuration → Redirect URLs**: add
   `https://ratioai.vercel.app/app/auth/native-bridge` and
   `https://ratioai.vercel.app/app/auth/callback`.

Steps 1–3 are the important ones. With them in place Apple sign-in completes
inside the app and never opens a browser at all.

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

- Password sign-in is now the primary action as soon as a password is typed, so
  entering credentials signs in instead of emailing a magic link
- Supabase password failures are translated into messages a reviewer can act on
- Pro paywall bypass for `reviewer@ratioai.app`
- `/waitlist` redirects to the real welcome/onboarding flow (no “almost here” dead end)
- Softened overclaims (removed “200+ Cuisines” / USDA badge)

### 2.1(a) Sign in with Apple returned to the login screen (iPad)

**Root cause — a sign-out loop, reproduced locally.** On a fresh install the
reviewer taps *“I already have an account”* and signs in with Apple. Apple
succeeds, but the device has no local profile yet, so the app sent them to
`/app/welcome`. They then went through onboarding, and its final step ran:

```js
await supabase.auth.signOut();
navigate("/app/signin", { replace: true });
```

So every attempt ended on the login screen, signed out — precisely what Apple
described. It reproduces 100% of the time on a clean install, on any device.

Fixes:

- `src/pages/app/onboarding/Analyzing.tsx` no longer signs anyone out. It opens the
  app when a session exists and only asks for sign-in when there genuinely is none.
- `getPostSignInPath` sends a freshly signed-in user with no profile into
  onboarding instead of back to the welcome screen.

**Secondary hardening** (these were also real, just not the main cause):

- `ASAuthorization` reports code 1001 (`canceled`) both when the user dismisses the
  sheet and when it fails to present. A cancel faster than a human could tap is now
  treated as a failure and falls back to browser OAuth.
- The hosted bridge retries the custom-scheme handoff (Safari blocks scheme
  navigation without a user gesture), retries on refocus, and shows a large
  **Open RatioAi** button.
- If the in-app browser closes without a session, the sign-in screen says so.
- Backend configuration hints (Supabase provider setup) are logged rather than
  displayed to users.
- The pre-routing cloud sync is bounded, so a stalled network cannot leave someone
  on the sign-in screen after a successful sign-in.

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
   - Review notes: mention that the reviewer account has Pro unlocked without purchasing.
3. Confirm the **Paid Applications Agreement** is active in Business → Agreements,
   otherwise products never become purchasable and the paywall will be empty.
4. In your app version page, scroll to **In-App Purchases and Subscriptions** and
   **add both products to the version**. This is the step that actually submits
   them alongside the binary — leaving it out reproduces this exact rejection.
5. Make sure the RevenueCat offering marked **current** contains both products, and
   that the entitlement is named `pro` (or set `VITE_REVENUECAT_ENTITLEMENT_ID`).

## After merge — your checklist

1. **Create `reviewer@ratioai.app` in Supabase** with a 6+ character password and
   *Auto Confirm User* ticked, then sign in with it yourself at
   `https://ratioai.vercel.app/app/signin` to prove it works.
2. **Enable the Apple provider in Supabase** and add `com.ratioai.ios` to its
   Authorized Client IDs, so the Apple button actually authenticates.
3. Fix App Privacy Nutrition Labels as above; redeploy so `/privacy` is live.
4. Confirm `OPENAI_API_KEY` on Vercel (meal scan works during review).
5. Attach both In-App Purchase products to the version and add the App Review
   screenshot for each (see above).
6. Redeploy `delete-account` edge function; `npm run cap:sync` and ship a new iOS build.
7. Paste the Review Notes above, with the **real** reviewer password, into App
   Store Connect. Do not leave `1234` there — Supabase cannot create an account
   with a 4-character password.

## HealthKit / CareKit (Guideline 2.5.1 — transparency)

Apple flagged that the binary linked HealthKit APIs without clear in-app HealthKit UI.

**Resolution in this codebase:** RatioAi does **not** use Apple Health / HealthKit / CareKit for any product feature. We removed the leftover `capacitor-health` native link from `ios/App/CapApp-SPM/Package.swift` so the App Store binary no longer includes HealthKit. There is no Health connect control in Profile or elsewhere because the feature does not exist.

Do **not** enable the HealthKit capability in Xcode for RatioAi unless you later ship a real Apple Health integration with clear UI labeling (e.g. “Connect Apple Health (HealthKit) to import steps”).

