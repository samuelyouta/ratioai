# Meal AI setup (OpenAI via Vercel)

Photo scan no longer depends on the broken Supabase edge-function deploy.
The app calls **Vercel serverless** routes that use your **OpenAI** key:

- `POST https://ratioai.vercel.app/api/analyze-meal`
- `POST https://ratioai.vercel.app/api/describe-meal`

## One-time: add OPENAI_API_KEY on Vercel

1. Open: https://vercel.com/samueljryouta-7135s-projects/ratioai/settings/environment-variables  
   (or Vercel → ratioai → Settings → Environment Variables)
2. Add:

| Name | Value | Environments |
|------|--------|----------------|
| `OPENAI_API_KEY` | same `sk-…` key you already have in Supabase | Production, Preview, Development |

3. Click **Save**, then **Redeploy** the latest production deployment (Deployments → ⋮ → Redeploy).

You do **not** need a Gemini key. You do **not** need to fix Supabase function deploy for meal scan to work.

## After this PR merges

- Web (`ratioai.vercel.app`): works after Vercel auto-redeploy (or Deployments → Redeploy) + env var
- iOS TestFlight: run `npm run cap:sync`, Archive, upload (client now calls `/api/analyze-meal`)

## Status (verified 2026-08-22)

Production `POST /api/analyze-meal` **boots correctly** (returns JSON, not `FUNCTION_INVOCATION_FAILED`).

It currently returns:

`OPENAI_API_KEY is missing on the server…`

Until that env var is set on Vercel and the project is redeployed, meal scans will still fail in the app (often as “Load failed” on iOS).

## Verify

1. `curl -X POST https://ratioai.vercel.app/api/analyze-meal -H 'Content-Type: application/json' -d '{}'`  
   should return JSON like `{"error":"imageBase64 required"}` (not `FUNCTION_INVOCATION_FAILED`)
2. Snap a meal photo in the app — you should get items + macros  
3. If you see “OPENAI_API_KEY is missing on the server”, the Vercel env var is not set or not redeployed yet  
4. If you still see WebKit “Load failed”, the API route is still crashing — check Vercel function logs

## Optional: still fix Supabase deploy later

Refresh https://supabase.com/dashboard/account/tokens and update GitHub secret `SUPABASE_ACCESS_TOKEN` if you want the Supabase edge functions updated too. Meal scan no longer requires that.
