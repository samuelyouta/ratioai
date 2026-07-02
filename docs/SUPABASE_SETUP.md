# Finish Supabase setup — project `myyjjtclthflfgxkgubr`

Dashboard: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr

## 1. App environment variables

Set these in **Vercel** (and locally in `.env`):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://myyjjtclthflfgxkgubr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_...` key |
| `VITE_SUPABASE_PROJECT_ID` | `myyjjtclthflfgxkgubr` |

## 2. Auth redirect URLs

**Authentication → URL Configuration → Redirect URLs**

Add:

- `https://ratioai.vercel.app/app/auth/callback`
- `http://localhost:8080/app/auth/callback` (local dev)

**Site URL:** `https://ratioai.vercel.app`

Enable providers: **Google**, **Apple**, **Email**.

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
