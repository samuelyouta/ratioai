# Finish Supabase setup — project `myyjjtclthflfgxkgubr`

Dashboard: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr

**App Store / TestFlight sign-in checklist:** see [`docs/AUTH_CHECKLIST.md`](./AUTH_CHECKLIST.md).

## 1. App environment variables

Set these in **Vercel** (and locally in `.env`):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://myyjjtclthflfgxkgubr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_...` key |
| `VITE_SUPABASE_PROJECT_ID` | `myyjjtclthflfgxkgubr` |

## 2. Auth redirect URLs (required for Google / Apple / Email)

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/url-configuration

**Site URL:** `https://ratioai.vercel.app`

**Redirect URLs** — add every line below:

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

Providers under **Authentication → Providers** (already enabled on this project):

- Google ✅
- Apple ✅
- Email ✅

### Google — required for native iOS sign-in

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/providers?provider=Google

Under **Client IDs**, enter **both** IDs comma-separated (web first, then iOS):

```
115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com,115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com
```

Without the iOS client ID, native Google sign-in returns `Unacceptable audience in id_token`.

Also enable **Skip nonce check** (recommended for native Apple/Google per Supabase docs).

### Apple — required for native iOS sign-in

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/auth/providers?provider=Apple

Confirm the Apple provider is enabled. In Xcode, the App target must include **Sign In with Apple** under Signing & Capabilities (entitlements file `ios/App/App/App.entitlements`).

Without these redirect URLs, Google/Apple return to Site URL (`/`) and login can fail.

## 3. Database setup (SQL Editor)

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/sql/new

Paste and run the contents of `supabase/pending-setup.sql`.

## 4. Deploy edge functions

### Option A — GitHub Actions (recommended)

1. Add secrets at https://github.com/samuelyouta/ratioai/settings/secrets/actions
   - `SUPABASE_ACCESS_TOKEN` — https://supabase.com/dashboard/account/tokens
   - `SUPABASE_DB_PASSWORD` — project database settings
2. Run: https://github.com/samuelyouta/ratioai/actions/workflows/supabase-deploy.yml

### Option B — Supabase CLI

```bash
supabase login
supabase link --project-ref myyjjtclthflfgxkgubr
supabase db push
supabase functions deploy delete-account analyze-meal describe-meal
```

## 5. Verify

After setup:

- `meals` and `edge_rate_limits` tables exist in Table Editor
- Edge Functions list includes `delete-account`, `analyze-meal`, `describe-meal`
- App sign-in and meal logging work on https://ratioai.vercel.app
- **Meal AI** — photo/describe analysis runs on Vercel with `OPENAI_API_KEY` (see [`docs/AI_SETUP.md`](./AI_SETUP.md))
