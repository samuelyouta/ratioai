/**
 * Meal photo analysis — Vercel Node serverless function (CommonJS).
 * Uses .cjs so package.json "type":"module" cannot break function boot.
 */

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const imageBase64 = req.body && req.body.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "imageBase64 required" });
    }

    const apiKey = getOpenAiKey();
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const parsed = await completeToolCall(apiKey, {
      model: "gpt-4o",
      toolName: "log_meal",
      tools: ANALYZE_TOOLS,
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
    });

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("analyze-meal error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("missing") || message.includes("rejected") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}

handler.config = {
  maxDuration: 60,
  memory: 1024,
};

module.exports = handler;

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

const ANALYZE_TOOLS = [
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

function getOpenAiKey() {
  const raw = (process.env.OPENAI_API_KEY || "").trim().replace(/^['"]|['"]$/g, "").trim();
  if (!raw) {
    throw new Error(
      "OPENAI_API_KEY is missing on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    );
  }
  return raw;
}

async function completeToolCall(apiKey, opts) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || "gpt-4o",
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: { type: "function", function: { name: opts.toolName } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI error", response.status, text);
    if (response.status === 401) {
      throw new Error("OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel env vars.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit reached, please try again in a moment.");
    }
    if (response.status === 400) {
      throw new Error("OpenAI could not process this request. Try a clearer meal photo.");
    }
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.tool_calls && data.choices[0].message.tool_calls[0];
  if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
    console.error("No tool call returned", JSON.stringify(data));
    throw new Error("AI did not return structured result");
  }
  const args = toolCall.function.arguments;
  return typeof args === "string" ? JSON.parse(args) : args;
}
