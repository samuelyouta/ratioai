import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { SocialLogin } from "@capgo/capacitor-social-login";

export type OAuthProvider = "google" | "apple";

const AUTH_REDIRECT_KEY = "ratioai.auth_redirect";
const NATIVE_LOGIN_TIMEOUT_MS = 90_000;
/** Public HTTPS origin for email magic links and native OAuth bridge. */
const PUBLIC_WEB_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_URL || "https://ratioai.vercel.app"
).replace(/\/$/, "");

/** Google OAuth client IDs (must match Info.plist + Supabase Auth → Google → Client IDs). */
export const GOOGLE_WEB_CLIENT_ID =
  "115954156521-qr7bi7462eetkfcltjsid71d70nhccvl.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID =
  "115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com";

/** Set VITE_NATIVE_SOCIAL_LOGIN=true to use on-device Google/Apple SDKs (needs Supabase iOS client ID). */
const USE_NATIVE_SOCIAL_LOGIN = import.meta.env.VITE_NATIVE_SOCIAL_LOGIN === "true";

let socialLoginInitialized = false;
let socialLoginInitPromise: Promise<void> | null = null;

/** Native custom-scheme callback (must match Info.plist CFBundleURLSchemes). */
export const NATIVE_AUTH_CALLBACK = "com.ratioai.ios://auth-callback";

/** HTTPS bridge — Supabase redirects here; page deep-links into the app. */
export const NATIVE_OAUTH_BRIDGE = `${PUBLIC_WEB_ORIGIN}/app/auth/native-bridge`;

export type SignInResult = {
  error: Error | null;
  cancelled?: boolean;
  nativeSession?: boolean;
  browserPending?: boolean;
};

export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${normalizedPath}`;
}

export function getAuthCallbackUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_OAUTH_BRIDGE;
  }
  return getAppUrl("/app/auth/callback");
}

export function storeAuthRedirect(path: string) {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
  } catch {
    /* storage unavailable */
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
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
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
    lower.includes("the user canceled") ||
    lower.includes("code: 12501") ||
    lower.includes("code=-5")
  );
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function isGoogleAudienceError(message: string): boolean {
  return message.toLowerCase().includes("unacceptable audience");
}

function isRecoverableNativeError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isGoogleAudienceError(message) ||
    lower.includes("nonce") ||
    lower.includes("invalid") ||
    lower.includes("1000") ||
    lower.includes("1001") ||
    lower.includes("authorizationerror")
  );
}

/**
 * Reliable native sign-in: Supabase OAuth in the in-app browser → HTTPS bridge → app deep link.
 * Uses the web Google client ID, so no iOS client ID is required in Supabase.
 */
async function signInWithBrowserOAuth(
  provider: OAuthProvider,
  redirectPath: string,
): Promise<SignInResult> {
  storeAuthRedirect(redirectPath);
  const options: { redirectTo: string; scopes?: string; skipBrowserRedirect: boolean } = {
    redirectTo: NATIVE_OAUTH_BRIDGE,
    skipBrowserRedirect: true,
  };
  if (provider === "apple") {
    options.scopes = "name email";
  }
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options });
  if (error || !data?.url) {
    return { error: new Error(error?.message ?? "Could not start sign-in.") };
  }
  await Browser.open({ url: data.url });
  return { error: null, browserPending: true };
}

async function nativeGoogleSignIn(redirectPath: string): Promise<SignInResult> {
  const result = await withTimeout(
    SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"], forcePrompt: true },
    }),
    NATIVE_LOGIN_TIMEOUT_MS,
    "Google sign-in",
  );
  const googleResult = result.result;
  if (!googleResult || googleResult.responseType !== "online" || !googleResult.idToken) {
    return signInWithBrowserOAuth("google", redirectPath);
  }
  const accessToken = googleResult.accessToken?.token ?? undefined;
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: googleResult.idToken,
    access_token: accessToken,
  });
  if (error) {
    if (isRecoverableNativeError(error.message)) {
      return signInWithBrowserOAuth("google", redirectPath);
    }
    return { error: new Error(error.message) };
  }
  return { error: null, nativeSession: true };
}

async function nativeAppleSignIn(redirectPath: string): Promise<SignInResult> {
  const rawNonce = generateNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  const result = await withTimeout(
    SocialLogin.login({
      provider: "apple",
      options: { scopes: ["name", "email"], nonce: hashedNonce },
    }),
    NATIVE_LOGIN_TIMEOUT_MS,
    "Apple sign-in",
  );
  const appleResult = result.result;
  if (!appleResult?.idToken) {
    return signInWithBrowserOAuth("apple", redirectPath);
  }
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: appleResult.idToken,
    nonce: rawNonce,
  });
  if (error) {
    if (isRecoverableNativeError(error.message)) {
      return signInWithBrowserOAuth("apple", redirectPath);
    }
    return { error: new Error(error.message) };
  }
  return { error: null, nativeSession: true };
}

export async function signInWithOAuth(
  provider: OAuthProvider,
  redirectPath = "/app/today",
): Promise<SignInResult> {
  storeAuthRedirect(redirectPath);

  if (!Capacitor.isNativePlatform()) {
    const options: { redirectTo: string; scopes?: string } = {
      redirectTo: getAuthCallbackUrl(),
    };
    if (provider === "apple") options.scopes = "name email";
    const { error } = await supabase.auth.signInWithOAuth({ provider, options });
    return { error: error ? new Error(error.message) : null };
  }

  // Default: browser OAuth (works with web client ID only — best for TestFlight).
  if (!USE_NATIVE_SOCIAL_LOGIN) {
    return signInWithBrowserOAuth(provider, redirectPath);
  }

  try {
    await ensureSocialLoginInitialized();
    if (provider === "google") return nativeGoogleSignIn(redirectPath);
    if (provider === "apple") return nativeAppleSignIn(redirectPath);
    return { error: new Error("Unknown provider") };
  } catch (e) {
    if (isCancelledError(e)) return { error: null, cancelled: true };
    return signInWithBrowserOAuth(provider, redirectPath);
  }
}

export function getEmailRedirectUrl(redirectPath = "/app/today"): string {
  storeAuthRedirect(redirectPath);
  if (Capacitor.isNativePlatform()) {
    return NATIVE_OAUTH_BRIDGE;
  }
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

export function formatOAuthError(provider: OAuthProvider, err: Error): string {
  const msg = err.message || "";
  if (msg.toLowerCase().includes("timed out")) return msg;
  return `${provider === "google" ? "Google" : "Apple"} sign-in failed. Try again.`;
}

export function browserPendingMessage(provider: OAuthProvider): string {
  return `Finish ${provider === "google" ? "Google" : "Apple"} sign-in in the browser window, then you’ll return here automatically.`;
}
