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

- Web (`ratioai.vercel.app`): works after Vercel redeploy + env var
- iOS TestFlight: run `npm run cap:sync`, Archive, upload (client now calls `/api/analyze-meal`)

## Verify

1. Snap a meal photo  
2. You should get items + macros  
3. If you see “OPENAI_API_KEY is missing on the server”, the Vercel env var is not set or not redeployed yet

## Optional: still fix Supabase deploy later

Refresh https://supabase.com/dashboard/account/tokens and update GitHub secret `SUPABASE_ACCESS_TOKEN` if you want the Supabase edge functions updated too. Meal scan no longer requires that.
