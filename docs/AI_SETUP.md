# Meal AI setup (photo scan + describe)

RatioAi’s `analyze-meal` and `describe-meal` edge functions call an AI provider using a secret in **Supabase Edge Function secrets**.

## Production setup (OpenAI)

You already use `OPENAI_API_KEY`. Confirm it here:

https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/settings/functions

| Name | Value |
|------|--------|
| `OPENAI_API_KEY` | your OpenAI secret key (`sk-…`) |

Then **redeploy** the functions so the latest code (which reads `OPENAI_API_KEY`) is live. Secrets alone are not enough if an older function build is still deployed.

### Deploy from your Mac (recommended)

```bash
npx supabase login
npx supabase functions deploy analyze-meal describe-meal --project-ref myyjjtclthflfgxkgubr
```

### Or GitHub Action

1. Refresh the token at https://supabase.com/dashboard/account/tokens  
2. Update GitHub secret `SUPABASE_ACCESS_TOKEN`  
3. Run **Deploy Supabase**: https://github.com/samuelyouta/ratioai/actions/workflows/supabase-deploy.yml  

## Provider order

1. `OPENAI_API_KEY` (preferred)
2. `LOVABLE_API_KEY`
3. `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY`

## Verify

1. Snap a meal photo in the app  
2. Analysis should return items + macros (not a missing-key error)  
3. Check function logs if it still fails:  
   https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/functions/analyze-meal/logs  
