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

async function send(
  event: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isTikTokAdsEnabled()) return;
  if (!(await initTikTokAds())) return;
  try {
    await TikTokEvents.trackEvent({ event, properties });
  } catch (e) {
    console.warn(`TikTok ${event} event failed`, e);
  }
}

export function trackRegistration(method: string): Promise<void> {
  return send("Registration", { registration_method: method });
}

export function trackOnboardingCompleted(): Promise<void> {
  return send("CompleteTutorial");
}

export function trackCheckoutStarted(productId: string): Promise<void> {
  return send("Checkout", { content_type: "subscription", content_id: productId });
}

export function trackSubscriptionPurchased(
  productId: string,
  amount: number,
  currency: string,
): Promise<void> {
  return send("Purchase", {
    content_type: "subscription",
    content_id: productId,
    currency: currency.toUpperCase(),
    value: amount.toFixed(2),
  });
}

export function resetTikTokAdsForTests(): void {
  initPromise = null;
}
