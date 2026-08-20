/**
 * Multi-provider meal AI helper for RatioAi edge functions.
 *
 * Preference order:
 * 1. LOVABLE_API_KEY  → https://ai.gateway.lovable.dev (OpenAI-compatible)
 * 2. GEMINI_API_KEY / GOOGLE_AI_API_KEY → Google Generative Language API
 * 3. OPENAI_API_KEY → OpenAI Chat Completions
 */

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

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

type Provider =
  | { kind: "lovable"; key: string }
  | { kind: "gemini"; key: string }
  | { kind: "openai"; key: string };

function resolveProvider(): Provider {
  const lovable = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (lovable) return { kind: "lovable", key: lovable };

  const gemini =
    Deno.env.get("GEMINI_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
  if (gemini) return { kind: "gemini", key: gemini };

  const openai = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (openai) return { kind: "openai", key: openai };

  throw new AiConfigError(
    "Meal AI is not configured. Add GEMINI_API_KEY (or LOVABLE_API_KEY / OPENAI_API_KEY) in Supabase → Edge Functions → Secrets.",
  );
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  toolName: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI-compatible gateway error", response.status, text);
    const err = new Error(
      response.status === 429
        ? "Rate limit reached, please try again in a moment."
        : response.status === 402
          ? "AI credits exhausted. Add funds or switch API keys in Supabase secrets."
          : "AI gateway error",
    );
    (err as Error & { status?: number }).status = response.status;
    throw err;
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

function toGeminiParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  // Gemini rejects some JSON Schema keywords used by OpenAI tools.
  const clone = JSON.parse(JSON.stringify(parameters)) as Record<string, unknown>;
  const scrub = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(scrub);
    const obj = node as Record<string, unknown>;
    delete obj.additionalProperties;
    if (Array.isArray(obj.type) && obj.type.includes("null")) {
      const nonNull = (obj.type as unknown[]).find((t) => t !== "null");
      obj.type = nonNull ?? "string";
      obj.nullable = true;
    }
    for (const [k, v] of Object.entries(obj)) {
      obj[k] = scrub(v);
    }
    return obj;
  };
  return scrub(clone) as Record<string, unknown>;
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  toolName: string,
): Promise<Record<string, unknown>> {
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(typeof msg.content === "string" ? msg.content : msg.content.map((p) => ("text" in p ? p.text : "")).join("\n"));
      continue;
    }

    const parts: Array<Record<string, unknown>> = [];
    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else {
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else {
          const parsed = parseDataUrl(part.image_url.url);
          if (parsed) {
            parts.push({
              inline_data: {
                mime_type: parsed.mimeType,
                data: parsed.data,
              },
            });
          } else {
            parts.push({ text: `[image] ${part.image_url.url}` });
          }
        }
      }
    }

    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  const tool = tools.find((t) => t.function.name === toolName) ?? tools[0];
  const body: Record<string, unknown> = {
    contents,
    tools: [
      {
        function_declarations: [
          {
            name: tool.function.name,
            description: tool.function.description,
            parameters: toGeminiParameters(tool.function.parameters),
          },
        ],
      },
    ],
    tool_config: {
      function_calling_config: {
        mode: "ANY",
        allowed_function_names: [toolName],
      },
    },
  };

  if (systemParts.length) {
    body.system_instruction = { parts: [{ text: systemParts.join("\n\n") }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Gemini gateway error", response.status, text);
    const err = new Error(
      response.status === 429
        ? "Rate limit reached, please try again in a moment."
        : "AI gateway error",
    );
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const fnPart = parts.find((p: { functionCall?: unknown }) => p.functionCall);
  const args = fnPart?.functionCall?.args;
  if (!args) {
    console.error("No Gemini function call returned", JSON.stringify(data));
    throw new Error("AI did not return structured result");
  }
  return args as Record<string, unknown>;
}

export async function completeToolCall(opts: {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  toolName: string;
  /** Preferred models per provider. */
  models?: {
    lovable?: string;
    gemini?: string;
    openai?: string;
  };
}): Promise<Record<string, unknown>> {
  const provider = resolveProvider();
  const models = opts.models ?? {};

  if (provider.kind === "lovable") {
    return callOpenAiCompatible(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      provider.key,
      models.lovable ?? "google/gemini-2.5-flash",
      opts.messages,
      opts.tools,
      opts.toolName,
    );
  }

  if (provider.kind === "openai") {
    return callOpenAiCompatible(
      "https://api.openai.com/v1/chat/completions",
      provider.key,
      models.openai ?? "gpt-4o",
      opts.messages,
      opts.tools,
      opts.toolName,
    );
  }

  return callGemini(
    provider.key,
    models.gemini ?? "gemini-2.0-flash",
    opts.messages,
    opts.tools,
    opts.toolName,
  );
}

export function aiErrorResponse(e: unknown, corsHeaders: Record<string, string>): Response {
  if (e instanceof AiConfigError) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = typeof e === "object" && e && "status" in e ? Number((e as { status: number }).status) : 500;
  if (status === 429) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Rate limit reached" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 402) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "AI credits exhausted" }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
