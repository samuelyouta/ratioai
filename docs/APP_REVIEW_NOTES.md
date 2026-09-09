# App Store Review Notes — RatioAi

Use these notes in **App Store Connect → App Review Information**, and update **App Privacy** to match.

## Demo account (Guideline 2.1)

| Field | Value |
|--------|--------|
| Email | `reviewer@ratioai.app` |
| Password | *(set in Supabase Auth — create this user with Email+Password enabled)* |

After password sign-in, this account **bypasses the Pro paywall** in-app so reviewers can test meal scan, history, and profile without purchasing.

**Paste into Review Notes:**

```
Demo account
Email: reviewer@ratioai.app
Password: <YOUR_REVIEWER_PASSWORD>

This account unlocks Pro features for review. Password sign-in is available on the Sign In screen (enter email + password).

Support URL: https://ratioai.vercel.app/support
Privacy Policy: https://ratioai.vercel.app/privacy
```

### Supabase setup (one-time)

1. Authentication → Providers → Email → enable Email + Password.
2. Create user `reviewer@ratioai.app` with a strong password.
3. Paste the same password into App Review notes.

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

- Password sign-in for the reviewer account
- Pro paywall bypass for `reviewer@ratioai.app`
- `/waitlist` redirects to the real welcome/onboarding flow (no “almost here” dead end)
- Softened overclaims (removed “200+ Cuisines” / USDA badge)

### 2.5.1 Software Requirements

- Meal AI client: 55s timeout, offline check, user-safe errors (no “redeploy Vercel / API key” strings)
- Removed unused HealthKit / Apple Health connect UI and usage strings

### 5.1.2 Privacy

- Rewrote Privacy Policy: photos, body metrics (health-related fitness), glucose clarification, purchase history, third parties (OpenAI, Supabase, RevenueCat/Apple), no tracking, deletion
- In-app `MedicalDisclaimer` on Welcome, onboarding, Today, Profile, Support, Terms
- Stopped syncing meal photo binaries to cloud (nutrition metadata only)
- Account delete clears this device’s `app_sessions` when `client_id` is sent

## After merge — your checklist

1. Create `reviewer@ratioai.app` in Supabase with password; enable Email+Password.
2. Fix App Privacy Nutrition Labels as above; redeploy so `/privacy` is live.
3. Confirm `OPENAI_API_KEY` on Vercel (meal scan works during review).
4. Redeploy `delete-account` edge function; `npm run cap:sync` and ship a new iOS build.
5. Paste Review Notes + demo credentials in App Store Connect.
