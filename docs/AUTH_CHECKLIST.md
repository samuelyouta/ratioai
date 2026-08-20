# Auth configuration checklist (App Store + TestFlight)

After onboarding, RatioAi requires a real account (Apple, Google, or email). Use this list before you submit to Apple.

## In the app (already in code)

- [x] Onboarding ends on **Save your plan** (`/app/signin`) with Apple, Google, and email
- [x] App screens (`/app/today`, log, profile, …) require a signed-in session
- [x] Sign in with Apple uses the native iOS sheet (required if Google is also offered)
- [x] Google uses the in-app browser OAuth flow (web client ID)
- [x] Email sends a magic link to `/app/auth/native-bridge` then back into the app

You still must complete the dashboard / Xcode items below.

## 1. Supabase — URL configuration

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/url-configuration

- [ ] **Site URL** = `https://ratioai.vercel.app`
- [ ] Redirect URLs include **all** of:

```
https://ratioai.vercel.app/**
https://ratioai.vercel.app/app/auth/callback
https://ratioai.vercel.app/app/auth/native-bridge
http://localhost:8080/**
http://localhost:8080/app/auth/callback
http://localhost:8080/app/auth/native-bridge
com.ratioai.ios://**
com.ratioai.ios://auth-callback
```

## 2. Supabase — providers

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/providers

### Email
- [ ] Email provider **enabled**
- [ ] Confirm email / magic link is enabled (passwordless OTP is fine)
- [ ] Magic Link email subject is **Your RatioAi signup link**  
      Dashboard: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/templates  
      (also applied by `npm run auth:emails` / GitHub Action `Deploy Supabase` when `SUPABASE_ACCESS_TOKEN` is set)

### Google
- [ ] Google provider **enabled**
- [ ] Client ID = web client ID  
  `115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com`
- [ ] Client secret = the web OAuth client secret from Google Cloud
- [ ] **Authorized Client IDs** (comma-separated, web then iOS):

```
115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com,115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com
```

- [ ] **Skip nonce check** enabled (helps native Apple / Google ID tokens)

### Apple
- [ ] Apple provider **enabled**
- [ ] **Client IDs** include the iOS bundle ID (required for native Sign in with Apple):

```
com.ratioai.ios
```

  If you also use web Apple sign-in, comma-separate your Services ID:

```
com.ratioai.ios,YOUR_APPLE_SERVICES_ID
```

- [ ] Services ID + secret key (JWT from your Apple `.p8`) — needed if native falls back to browser
- [ ] **Skip nonce check** enabled

## 3. Google Cloud

Open: https://console.cloud.google.com/apis/credentials

- [ ] **Web** OAuth client ID exists (the one in step 2)
- [ ] Authorized JavaScript origins include `https://ratioai.vercel.app` and `https://myyjjtclthflfgxkgubr.supabase.co`
- [ ] Authorized redirect URIs include  
  `https://myyjjtclthflfgxkgubr.supabase.co/auth/v1/callback`
- [ ] **iOS** OAuth client ID exists, bundle ID `com.ratioai.ios`  
  `115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com`

## 4. Apple Developer + Xcode (required for App Store)

- [ ] App ID `com.ratioai.ios` has **Sign In with Apple** capability
- [ ] In Xcode → Signing & Capabilities → **Sign In with Apple** is listed
- [ ] `ios/App/App/App.entitlements` contains `com.apple.developer.applesignin`
- [ ] Provisioning profile was regenerated after enabling the capability
- [ ] Archive / TestFlight build is from **latest `main`** after `npm install && npm run cap:sync`

## 5. Vercel

- [ ] Latest `main` is deployed (needed for `/app/auth/native-bridge`)
- [ ] Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## 6. Manual test (do this before App Review)

1. Delete the app (or clear data) so onboarding runs again.
2. Finish onboarding → you **must** see **Save your plan** with Apple / Google / Email.
3. **Apple**: native sheet → Face ID → you enter the app (paywall or Today).
4. **Google**: browser account picker → **Open RatioAi** if asked → you enter the app.
5. **Email**: request link → open mail → link opens app → you enter the app.
6. You cannot reach Today / Log without completing one of those.

## If App Review asks about account creation

Reply that users create an account after onboarding via **Sign in with Apple**, **Google**, or **email magic link**, and that Sign in with Apple is always offered as an equivalent option.
