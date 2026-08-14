import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { SocialLogin } from "@capgo/capacitor-social-login";

export type OAuthProvider = "google" | "apple";

const AUTH_REDIRECT_KEY = "ratioai.auth_redirect";
let socialLoginInitialized = false;

/** Native custom-scheme callback (must match Info.plist CFBundleURLSchemes). */
export const NATIVE_AUTH_CALLBACK = "com.ratioai.ios://auth-callback";

/** Build an absolute app URL that respects Vite's BASE_URL. */
export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${normalizedPath}`;
}

/** OAuth / magic-link return URL for the current platform (web only — native uses SDKs). */
export function getAuthCallbackUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_CALLBACK;
  }
  return getAppUrl("/app/auth/callback");
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

async function ensureSocialLoginInitialized() {
  if (socialLoginInitialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId: "115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com",
      iOSClientId: "115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com",
    },
    apple: {},
  });
  socialLoginInitialized = true;
}

/**
 * Sign in with Google or Apple.
 * Native: uses on-device SDKs via capacitor-social-login (no browser redirect).
 * Web: standard Supabase OAuth redirect to /app/auth/callback (PKCE).
 */
export async function signInWithOAuth(provider: OAuthProvider, redirectPath = "/app/today") {
  storeAuthRedirect(redirectPath);

  if (!Capacitor.isNativePlatform()) {
    const options: { redirectTo: string; scopes?: string } = {
      redirectTo: getAuthCallbackUrl(),
    };
    if (provider === "apple") {
      options.scopes = "name email";
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options });
    return { error };
  }

  try {
    await ensureSocialLoginInitialized();

    if (provider === "google") {
      const result = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["email", "profile"] },
      });
      alert("SocialLogin result: " + JSON.stringify(result));
      const googleResult = result.result;
      if (!googleResult || googleResult.responseType !== "online" || !googleResult.idToken) {
        alert("Google result invalid: " + JSON.stringify(googleResult));
        return { error: new Error("Google sign-in failed") };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: googleResult.idToken,
      });
      if (error) alert("signInWithIdToken error: " + error.message);
      return { error };
    }

    if (provider === "apple") {
      const result = await SocialLogin.login({ provider: "apple", options: {} });
      const appleResult = result.result;
      if (!appleResult?.idToken) {
        return { error: new Error("Apple sign-in failed") };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: appleResult.idToken,
      });
      return { error };
    }

    return { error: new Error("Unknown provider") };
  } catch (e) {
    alert("SignIn exception: " + (e instanceof Error ? e.message : String(e)));
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Magic-link redirect target — same callback as OAuth for the platform. */
export function getEmailRedirectUrl(redirectPath = "/app/today"): string {
  storeAuthRedirect(redirectPath);
  return getAuthCallbackUrl();
}