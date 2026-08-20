# Deploy Supabase (no local terminal needed)

Use GitHub Actions to run `supabase db push` and deploy edge functions from the browser.

## One-time setup (GitHub website only)

### 1. Create a Supabase access token

Open: https://supabase.com/dashboard/account/tokens

Click **Generate new token**, copy it.

### 2. Get your database password

Open: https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/settings/database

Copy the **Database password** (or reset it if unknown).

### 3. Add GitHub secrets

Open: https://github.com/samuelyouta/ratioai/settings/secrets/actions

Click **New repository secret** and add:

| Name | Value |
|------|--------|
| `SUPABASE_ACCESS_TOKEN` | token from step 1 (must stay valid — regenerate if Deploy Supabase fails with Unauthorized) |
| `SUPABASE_DB_PASSWORD` | password from step 2 |

## Deploy (one click)

1. Open: https://github.com/samuelyouta/ratioai/actions/workflows/supabase-deploy.yml
2. Click **Run workflow** → **Run workflow**

This runs:

```bash
supabase link --project-ref myyjjtclthflfgxkgubr
supabase db push
supabase functions deploy delete-account analyze-meal describe-meal
```

## Verify

- **Tables:** https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/editor → `edge_rate_limits`, `profiles`, `meals`
- **Functions:** https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/functions

## Cursor Cloud Agent

To let the cloud agent run these commands directly, add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` as **Cursor Cloud secrets** for this repo, then ask the agent to deploy again.

## Manual fallback (Supabase Dashboard)

If you prefer not to use GitHub Actions, run each file in **SQL Editor**:

- `supabase/migrations/20260701143105_895f7ee7-99ae-47ed-a542-c02007e589bb.sql`
- `supabase/migrations/20260701160000_meals_user_client_unique.sql`
- `supabase/migrations/20260702120000_edge_rate_limits.sql`

Then deploy each function folder under **Edge Functions** in the dashboard.
