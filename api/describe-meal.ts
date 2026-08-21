import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeToolCall, setCors, type ToolDefinition } from "./_lib/openaiMeal";

export const config = {
  maxDuration: 30,
};

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

const tools: ToolDefinition[] = [
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const description = req.body?.description;
    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return res.status(400).json({ error: "description required" });
    }

    const parsed = await completeToolCall({
      model: "gpt-4o-mini",
      toolName: "log_meal",
      tools,
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
