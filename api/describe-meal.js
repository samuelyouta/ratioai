/**
 * Text meal estimate — Vercel Node serverless function (CommonJS).
 * Uses .cjs so package.json "type":"module" cannot break function boot.
 */

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const description = req.body && req.body.description;
    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return res.status(400).json({ error: "description required" });
    }

    const apiKey = getOpenAiKey();
    const parsed = await completeToolCall(apiKey, {
      model: "gpt-4o-mini",
      toolName: "log_meal",
      tools: DESCRIBE_TOOLS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Estimate this meal: ${description.trim()}` },
      ],
    });

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("describe-meal error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("missing") || message.includes("rejected") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}

handler.config = {
  maxDuration: 30,
};

module.exports = handler;

const SYSTEM_PROMPT = `You are RatioAi's text-based food estimator. The user describes a meal in natural language
(e.g. "a big bowl of homemade lasagna and a side salad", "two eggs on toast with butter").

Your job:
1. Break the description into distinct food items.
2. Infer reasonable portion sizes based on cues like "big", "small", "side", "bowl", "plate", "slice", "cup".
   When no size is given, assume a standard adult restaurant/home portion.
3. Estimate calories and macros (protein/carbs/fat in grams) per item using USDA-style averages.
4. If the dish is typically cooked with hidden fats (lasagna cheese/oil, stir-fry oil, dressing), reflect this in the item macros and mention it in hiddenIngredient.
5. Mark this as an *estimated* entry — confidence should reflect how vague the description is.

Return ONLY a tool call to log_meal. If the text doesn't describe food, return items: [] and explain in notes.`;

const DESCRIBE_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Return the structured estimate of the described meal.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short meal title, e.g. 'Lasagna & Side Salad'" },
          icon: { type: "string", description: "Single food emoji that best represents the meal." },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                portion: { type: "string", description: "Human portion description, e.g. '~350g (1 large bowl)'" },
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
            description: "If hidden cooking fat/sauce/cheese is implied, describe it. Null otherwise.",
          },
          notes: { type: "string", description: "One-line note for the user, e.g. 'Estimated from description.'" },
        },
        required: ["title", "icon", "items", "hiddenIngredient", "notes"],
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
