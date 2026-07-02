import { supabase } from "@/integrations/supabase/client";

export type OAuthProvider = "google" | "apple";

const AUTH_REDIRECT_KEY = "ratioai.auth_redirect";

/** Build an absolute app URL that respects Vite's BASE_URL (e.g. GitHub Pages /ratioai/). */
export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${normalizedPath}`;
}

export function storeAuthRedirect(path: string) {
  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function consumeAuthRedirect(fallback = "/app/today"): string {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  return stored || fallback;
}

/**
 * Sign in with Google or Apple via Supabase OAuth (works on any host).
 * The browser navigates away to the provider; on return, /app/auth/callback
 * completes the session and redirects to the stored destination.
 */
export async function signInWithOAuth(provider: OAuthProvider, redirectPath = "/app/today") {
  storeAuthRedirect(redirectPath);

  const options: {
    redirectTo: string;
    queryParams?: Record<string, string>;
    scopes?: string;
  } = {
    redirectTo: getAppUrl("/app/auth/callback"),
  };

  if (provider === "apple") {
    options.scopes = "name email";
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  return { error };
}

/** Magic-link redirect target — same callback route as OAuth. */
export function getEmailRedirectUrl(redirectPath = "/app/today"): string {
  storeAuthRedirect(redirectPath);
  return getAppUrl("/app/auth/callback");
}
