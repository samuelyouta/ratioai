import { getPlatform } from "@/lib/native";
import { requestTrackingPermission } from "@/lib/attPrompt";
import { TikTokEvents } from "@/lib/tiktokPlugin";

/**
 * TikTok App Events for app-install ad campaigns.
 *
 * - Dormant unless `VITE_TIKTOK_ADS_ENABLED=true`, both TikTok ids are set, and the app
 *   runs natively on iOS, so builds are unchanged until TikTok is fully configured.
 * - The SDK starts after the App Tracking Transparency prompt so installs are
 *   reported with the user's real tracking choice. Declining still allows
 *   SKAdNetwork-attributed measurement.
 * - Install, launch and retention events are automatic. Automatic payment tracking
 *   is disabled natively; purchases are sent once from the paywall with the real price.
 * - Only generic funnel events are sent. Never pass meals, photos, body metrics, goals,
 *   name or email as event properties.
 */

let initPromise: Promise<boolean> | null = null;

interface TikTokCredentials {
  accessToken: string;
  /** App Store numeric id (e.g. 6787262904). */
  appId: string;
  /** "TikTok App ID" from TikTok Events Manager. */
  tiktokAppId: string;
}

function credentials(): TikTokCredentials | null {
  const accessToken = import.meta.env.VITE_TIKTOK_ACCESS_TOKEN;
  const tiktokAppId = import.meta.env.VITE_TIKTOK_APP_ID;
  const appId = import.meta.env.VITE_TIKTOK_APP_STORE_ID || "6787262904";
  if (!accessToken || !tiktokAppId) return null;
  return { accessToken, tiktokAppId, appId };
}

export function isTikTokAdsEnabled(): boolean {
  return (
    import.meta.env.VITE_TIKTOK_ADS_ENABLED === "true" &&
    getPlatform() === "ios" &&
    credentials() !== null
  );
}

async function startTikTokSdk(): Promise<boolean> {
  const creds = credentials();
  if (!creds) return false;
  try {
    await requestTrackingPermission();
    await TikTokEvents.initialize({
      ...creds,
      debug: import.meta.env.VITE_TIKTOK_DEBUG === "true",
    });
    return true;
  } catch (e) {
    console.warn("TikTok SDK init failed", e);
    return false;
  }
}

/** Idempotent. Resolves to true once TikTok App Events are live. */
export function initTikTokAds(): Promise<boolean> {
  if (!isTikTokAdsEnabled()) return Promise.resolve(false);
  if (!initPromise) initPromise = startTikTokSdk();
  return initPromise;
}

async function call(label: string, action: () => Promise<void>): Promise<void> {
  if (!isTikTokAdsEnabled()) return;
  if (!(await initTikTokAds())) return;
  try {
    await action();
  } catch (e) {
    console.warn(`TikTok ${label} failed`, e);
  }
}

function send(event: string, properties?: Record<string, unknown>): Promise<void> {
  return call(`${event} event`, () => TikTokEvents.trackEvent({ event, properties }));
}

export interface ProductDetails {
  productId: string;
  amount: number;
  currency: string;
  title?: string;
}

/** Same shape the TikTok SDK's own Purchase/Checkout events build (`TikTokContentParams`). */
function productProperties({ productId, amount, currency, title }: ProductDetails) {
  const price = amount.toFixed(2);
  return {
    content_type: "subscription",
    content_id: productId,
    currency: currency.toUpperCase(),
    value: price,
    ...(title ? { description: title } : {}),
    contents: [
      {
        price,
        quantity: 1,
        content_id: productId,
        ...(title ? { content_name: title } : {}),
      },
    ],
  };
}

/** Ties events to a pseudonymous account id, improving match quality. No name, email or phone. */
export function identify(userId: string): Promise<void> {
  return call("identify", () => TikTokEvents.identify({ externalId: userId }));
}

export function logout(): Promise<void> {
  return call("logout", () => TikTokEvents.logout());
}

export function trackRegistration(method: string): Promise<void> {
  return send("Registration", { registration_method: method });
}

export function trackLogin(): Promise<void> {
  return send("Login");
}

export function trackOnboardingCompleted(): Promise<void> {
  return send("CompleteTutorial");
}

export function trackCheckoutStarted(details: ProductDetails): Promise<void> {
  return send("Checkout", productProperties(details));
}

/** `Purchase` carries the value for value-based optimization; `Subscribe` marks it as a subscription. */
export async function trackSubscriptionPurchased(details: ProductDetails): Promise<void> {
  const properties = productProperties(details);
  await send("Purchase", properties);
  await send("Subscribe", properties);
}

export function resetTikTokAdsForTests(): void {
  initPromise = null;
}
