import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_WEB_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_URL || "https://ratioai.vercel.app"
).replace(/\/$/, "");

/**
 * Meal AI calls go to Vercel serverless routes that use OPENAI_API_KEY.
 * (Supabase edge deploy is currently blocked by an expired access token,
 * so production still has the old Lovable-only functions.)
 */
function mealAiBaseUrl(): string {
  // Native Capacitor always hits the public web origin.
  if (Capacitor.isNativePlatform()) return PUBLIC_WEB_ORIGIN;
  // Local Vite: prefer same-origin only if /api is proxied; otherwise public origin.
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return PUBLIC_WEB_ORIGIN;
  }
  return PUBLIC_WEB_ORIGIN;
}

async function postMealAi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${mealAiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const errMsg =
      payload && typeof payload === "object" && "error" in payload && (payload as { error?: string }).error
        ? String((payload as { error: string }).error)
        : `Meal AI request failed (${res.status})`;
    throw new Error(errMsg);
  }

  if (payload && typeof payload === "object" && "error" in payload && (payload as { error?: string }).error) {
    throw new Error(String((payload as { error: string }).error));
  }

  return payload as T;
}

export function analyzeMealPhoto<T = unknown>(imageBase64: string): Promise<T> {
  return postMealAi<T>("/api/analyze-meal", { imageBase64 });
}

export function describeMealText<T = unknown>(description: string): Promise<T> {
  return postMealAi<T>("/api/describe-meal", { description });
}
