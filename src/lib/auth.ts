import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { SocialLogin } from "@capgo/capacitor-social-login";

export type OAuthProvider = "google" | "apple";

const AUTH_REDIRECT_KEY = "ratioai.auth_redirect";
const NATIVE_LOGIN_TIMEOUT_MS = 90_000;
/** Public HTTPS origin for email magic links (Mail cannot reliably use custom schemes). */
const PUBLIC_WEB_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_URL || "https://ratioai.vercel.app"
).replace(/\/$/, "");

let socialLoginInitialized = false;
let socialLoginInitPromise: Promise<void> | null = null;

/** Native custom-scheme callback (must match Info.plist CFBundleURLSchemes). */
export const NATIVE_AUTH_CALLBACK = "com.ratioai.ios://auth-callback";

export type SignInResult = {
  error: Error | null;
  /** True when the user dismissed the native provider sheet. */
  cancelled?: boolean;
  /** True when native SDKs completed and a Supabase session was created (no browser redirect). */
  nativeSession?: boolean;
};

/** Build an absolute app URL that respects Vite's BASE_URL. */
export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${normalizedPath}`;
}

/** OAuth return URL for browser-based flows (web only — native uses SDKs). */
export function getAuthCallbackUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_CALLBACK;
  }
  return getAppUrl("/app/auth/callback");
}

export function storeAuthRedirect(path: string) {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
  } catch {
    /* private mode / storage full */
  }
}

export function consumeAuthRedirect(fallback = "/app/today"): string {
  try {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    return stored || fallback;
  } catch {
    return fallback;
  }
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

/** Parse auth query/hash from a deep-link URL into a path usable by the router. */
export function authCallbackPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const search = parsed.search || "";
    const hash = parsed.hash || "";
    if (!hasAuthCallbackParams(search, hash)) return null;
    return `/app/auth/callback${search}${hash}`;
  } catch {
    return null;
  }
}

async function ensureSocialLoginInitialized() {
  if (socialLoginInitialized) return;
  if (!socialLoginInitPromise) {
    socialLoginInitPromise = SocialLogin.initialize({
      google: {
        webClientId: "115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com",
        iOSClientId: "115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com",
        mode: "online",
      },
      apple: {},
    })
      .then(() => {
        socialLoginInitialized = true;
      })
      .catch((err) => {
        socialLoginInitPromise = null;
        throw err;
      });
  }
  await socialLoginInitPromise;
}

function generateNonce(length = 32): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  randomValues.forEach((v) => {
    result += chars[v % chars.length];
  });
  return result;
}

/** SHA-256 hex digest — Apple's ASAuthorization request expects the hashed nonce. */
async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Close any sign-in sheet and try again.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function isCancelledError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return (
    lower.includes("cancel") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    lower.includes("error 1001") ||
    // Google Sign-In cancelled
    lower.includes("the user canceled") ||
    lower.includes("code: 12501") ||
    lower.includes("code=-5")
  );
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Sign in with Google or Apple.
 * Native: on-device SDKs via capacitor-social-login → supabase.auth.signInWithIdToken.
 * Web: Supabase OAuth redirect to /app/auth/callback (PKCE).
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  redirectPath = "/app/today",
): Promise<SignInResult> {
  storeAuthRedirect(redirectPath);

  if (!Capacitor.isNativePlatform()) {
    const options: { redirectTo: string; scopes?: string } = {
      redirectTo: getAuthCallbackUrl(),
    };
    if (provider === "apple") {
      options.scopes = "name email";
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options });
    return { error: error ? new Error(error.message) : null };
  }

  try {
    await ensureSocialLoginInitialized();

    if (provider === "google") {
      const result = await withTimeout(
        SocialLogin.login({
          provider: "google",
          options: {
            scopes: ["email", "profile"],
            // Skip restorePreviousSignIn — that path can hang when a stale Google session exists.
            forcePrompt: true,
          },
        }),
        NATIVE_LOGIN_TIMEOUT_MS,
        "Google sign-in",
      );
      const googleResult = result.result;
      if (!googleResult || googleResult.responseType !== "online" || !googleResult.idToken) {
        return { error: new Error("Google sign-in did not return an ID token.") };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: googleResult.idToken,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null, nativeSession: true };
    }

    if (provider === "apple") {
      // Apple expects SHA-256(nonce) on the request; Supabase re-hashes the raw nonce.
      const rawNonce = generateNonce();
      const hashedNonce = await sha256Hex(rawNonce);
      const result = await withTimeout(
        SocialLogin.login({
          provider: "apple",
          options: {
            scopes: ["name", "email"],
            nonce: hashedNonce,
          },
        }),
        NATIVE_LOGIN_TIMEOUT_MS,
        "Apple sign-in",
      );
      const appleResult = result.result;
      if (!appleResult?.idToken) {
        return { error: new Error("Apple sign-in did not return an ID token.") };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: appleResult.idToken,
        nonce: rawNonce,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null, nativeSession: true };
    }

    return { error: new Error("Unknown provider") };
  } catch (e) {
    if (isCancelledError(e)) {
      return { error: null, cancelled: true };
    }
    return { error: toError(e) };
  }
}

/**
 * Magic-link redirect. Prefer HTTPS so links opened from Mail work.
 * On native, deep links into the app are handled via AuthDeepLink.
 */
export function getEmailRedirectUrl(redirectPath = "/app/today"): string {
  storeAuthRedirect(redirectPath);
  if (Capacitor.isNativePlatform()) {
    // Custom scheme is listed in Supabase redirect allow-list and opens the app.
    return NATIVE_AUTH_CALLBACK;
  }
  // When origin is a Capacitor/web preview host, fall back to the public site.
  if (
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname.endsWith(".local"))
  ) {
    return `${PUBLIC_WEB_ORIGIN}/app/auth/callback`;
  }
  return getAppUrl("/app/auth/callback");
}

/** User-facing message for OAuth failures (Apple 1000, etc.). */
export function formatOAuthError(provider: OAuthProvider, err: Error): string {
  const msg = err.message || "";
  if (msg.includes("1000") || msg.toLowerCase().includes("authorizationerror")) {
    return (
      "Apple Sign In is not available on this build. In Xcode, confirm Signing & Capabilities " +
      "includes Sign In with Apple, then rebuild with a fresh provisioning profile."
    );
  }
  if (msg.toLowerCase().includes("timed out")) {
    return msg;
  }
  return `${provider === "google" ? "Google" : "Apple"} sign-in failed. Try again.`;
}
