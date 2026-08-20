# Meal AI setup (photo scan + describe)

RatioAi’s `analyze-meal` and `describe-meal` edge functions need an AI API key in **Supabase secrets**. Without one, photo scan shows “LOVABLE_API_KEY missing” / “Meal AI is not configured”.

## Recommended (free): Google Gemini

1. Create a key: https://aistudio.google.com/apikey  
2. Open Supabase secrets:  
   https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/settings/functions  
3. Under **Edge Function Secrets**, add:

| Name | Value |
|------|--------|
| `GEMINI_API_KEY` | your Google AI Studio key |

4. Save. No app rebuild is required for the secret itself — only redeploy functions if you haven’t shipped the multi-provider update yet.

## Alternatives

Any **one** of these works (first found wins):

1. `LOVABLE_API_KEY` — from Lovable Cloud → Secrets (if still linked)
2. `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` — Google AI Studio
3. `OPENAI_API_KEY` — OpenAI platform key (vision model)

## Deploy functions after this code change

```bash
supabase functions deploy analyze-meal describe-meal
```

Or run the GitHub Action: **Deploy Supabase**.

## Verify

1. Open the iOS app / https://ratioai.vercel.app  
2. Log → take a meal photo → analyze  
3. You should get items, macros, and a save button (not a missing-key error)
