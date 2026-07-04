import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest } from "../_shared/auth.ts";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "../_shared/rateLimit.ts";

const SYSTEM_PROMPT = `You are RatioAi's vision-powered food analyst. The user sends a single photo of food.

Your job:
1. Identify every distinct food item visible.
2. Estimate portion size in grams using visual volume + reference objects (plate ~25cm, fork, hand).
3. Estimate calories and macros (protein/carbs/fat in grams) per item using USDA-style averages.
4. Detect hidden cooking fats/sauces that are NOT visible but very likely present:
   - Stir-fries, fried rice, sautéed vegetables → cooking oil (~1 tbsp, ~120 cal)
   - Grilled/fried proteins with sheen → butter or oil (~1 tsp–1 tbsp)
   - Salads with glossy leaves → dressing (~2 tbsp, ~140 cal)
   - Pasta, lasagna, pizza, creamy sauces → cheese/oil/butter in preparation
   - Restaurant or takeout plates → assume extra oil vs home-cooked
   Set hiddenIngredient to a short label with estimated calories (e.g. "~1 tbsp olive oil, +120 cal").
   Set hiddenIngredientCalories to the numeric added calories (0 if none likely).
   Do NOT double-count: item macros should reflect the food itself; hiddenIngredient is only for added fats/sauces.

Return ONLY a tool call to log_meal. Be confident but realistic. If the image isn't food, return items: [] and set notes accordingly.`;

const tools = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Return the structured analysis of the meal photo.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short meal title, e.g. 'Grilled Chicken Bowl'" },
          icon: { type: "string", description: "Single food emoji that best represents the meal." },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                portion: { type: "string", description: "Human portion description, e.g. '150g (1 piece)'" },
                grams: { type: "number" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" },
                confidence: { type: "number", description: "0-100" },
              },
              required: ["name", "portion", "calories", "protein", "carbs", "fat", "confidence"],
              additionalProperties: false,
            },
          },
          hiddenIngredient: {
            type: ["string", "null"],
            description:
              "If a hidden cooking fat/sauce is likely present, describe it (e.g. '~1 tbsp cooking oil, +120 cal'). Null otherwise.",
          },
          hiddenIngredientCalories: {
            type: "number",
            description: "Estimated calories from the hidden ingredient alone (0 if none).",
          },
          notes: { type: "string", description: "One-line note for the user." },
        },
        required: ["title", "icon", "items", "hiddenIngredient", "hiddenIngredientCalories", "notes"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const bucket = user ? `analyze-meal:user:${user.id}` : `analyze-meal:ip:${getClientIp(req)}`;
    const limit = await consumeRateLimit(bucket, user ? 40 : 10, 3_600);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this meal photo." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "log_meal" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return structured result" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-meal error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
