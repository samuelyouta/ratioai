import { supabase } from "@/integrations/supabase/client";

export type OAuthProvider = "google" | "apple";

const AUTH_REDIRECT_KEY = "ratioai.auth_redirect";

/** Build an absolute app URL that respects Vite's BASE_URL (e.g. GitHub Pages /ratioai/). */
export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Must use the current origin so Supabase PKCE code verifier stays on the same host.
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

/** True when the current URL looks like a Supabase auth callback (code or tokens). */
export function hasAuthCallbackParams(
  search = typeof window !== "undefined" ? window.location.search : "",
  hash = typeof window !== "undefined" ? window.location.hash : "",
): boolean {
  const query = new URLSearchParams(search);
  if (query.has("code") || query.has("error") || query.has("error_description")) return true;
  if (!hash || hash.length < 2) return false;
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error") ||
    hashParams.has("error_description")
  );
}

/**
 * Sign in with Google or Apple via Supabase OAuth.
 * Returns to /app/auth/callback on the same origin (required for PKCE).
 */
export async function signInWithOAuth(provider: OAuthProvider, redirectPath = "/app/today") {
  storeAuthRedirect(redirectPath);

  const redirectTo = getAppUrl("/app/auth/callback");

  const options: {
    redirectTo: string;
    queryParams?: Record<string, string>;
    scopes?: string;
  } = { redirectTo };

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
