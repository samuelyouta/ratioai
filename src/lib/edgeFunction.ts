import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload === "object" && "error" in payload && payload.error) {
          throw new Error(String(payload.error));
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== error.message) {
          throw parseErr;
        }
      }
    }
    throw error;
  }

  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }

  return data as T;
}
