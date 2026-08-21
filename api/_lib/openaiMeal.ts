/** Shared OpenAI meal analysis helpers for Vercel serverless routes. */

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

function getOpenAiKey(): string {
  const raw = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "").trim();
  if (!raw) {
    throw new Error(
      "OPENAI_API_KEY is missing on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    );
  }
  return raw;
}

export async function completeToolCall(opts: {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  toolName: string;
  model?: string;
}): Promise<Record<string, unknown>> {
  const apiKey = getOpenAiKey();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "gpt-4o",
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
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("No tool call returned", JSON.stringify(data));
    throw new Error("AI did not return structured result");
  }
  const args = toolCall.function.arguments;
  return typeof args === "string" ? JSON.parse(args) : args;
}

export function setCors(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
}
