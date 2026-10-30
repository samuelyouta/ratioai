import {
  FacebookAnalytics,
  FacebookEventName,
  FacebookEventParameterName,
} from "@capgo/capacitor-facebook-analytics";
import { getPlatform } from "@/lib/native";
import { requestTrackingPermission, resetTrackingPermissionForTests } from "@/lib/attPrompt";

/**
 * Meta (Facebook) App Events for app-install ad campaigns.
 *
 * - Dormant unless `VITE_META_ADS_ENABLED=true` AND the app runs natively on iOS,
 *   so builds keep behaving exactly as before until Meta is fully configured.
 * - The native SDK is started only after the App Tracking Transparency prompt
 *   (Info.plist has FacebookAutoInitEnabled / FacebookAutoLogAppEventsEnabled = false).
 * - Only generic funnel events are sent. Never pass meals, photos, weight, goals
 *   or any other health data as event parameters (Meta policy + App Review).
 */

let initPromise: Promise<boolean> | null = null;

export function isMetaAdsEnabled(): boolean {
  return import.meta.env.VITE_META_ADS_ENABLED === "true" && getPlatform() === "ios";
}

async function startMetaSdk(): Promise<boolean> {
  try {
    const authorized = await requestTrackingPermission();

    if (authorized) {
      await FacebookAnalytics.enableAdvertiserTracking();
    } else {
      await FacebookAnalytics.disableAdvertiserTracking();
    }

    // Without IDFA consent Meta still receives aggregated, SKAdNetwork-attributed events.
    await FacebookAnalytics.initAppEvents();
    return true;
  } catch (e) {
    console.warn("Meta SDK init failed", e);
    return false;
  }
}

/** Idempotent. Resolves to true once Meta App Events are live. */
export function initMetaAds(): Promise<boolean> {
  if (!isMetaAdsEnabled()) return Promise.resolve(false);
  if (!initPromise) initPromise = startMetaSdk();
  return initPromise;
}

async function whenReady(): Promise<boolean> {
  if (!isMetaAdsEnabled()) return false;
  return initMetaAds();
}

export async function trackRegistration(method: string): Promise<void> {
  if (!(await whenReady())) return;
  try {
    await FacebookAnalytics.logEvent({
      event: FacebookEventName.CompletedRegistration,
      params: { [FacebookEventParameterName.RegistrationMethod]: method },
    });
  } catch (e) {
    console.warn("Meta registration event failed", e);
  }
}

export async function trackOnboardingCompleted(): Promise<void> {
  if (!(await whenReady())) return;
  try {
    await FacebookAnalytics.logEvent({
      event: FacebookEventName.CompletedTutorial,
      params: { [FacebookEventParameterName.Success]: true },
    });
  } catch (e) {
    console.warn("Meta onboarding event failed", e);
  }
}

export async function trackCheckoutStarted(productId: string): Promise<void> {
  if (!(await whenReady())) return;
  try {
    await FacebookAnalytics.logEvent({
      event: FacebookEventName.InitiatedCheckout,
      params: {
        [FacebookEventParameterName.ContentType]: "subscription",
        [FacebookEventParameterName.ContentId]: productId,
      },
    });
  } catch (e) {
    console.warn("Meta checkout event failed", e);
  }
}

export async function trackSubscriptionPurchased(
  productId: string,
  amount: number,
  currency: string,
): Promise<void> {
  if (!(await whenReady())) return;
  try {
    await FacebookAnalytics.logPurchase({
      amount,
      currency,
      params: {
        [FacebookEventParameterName.ContentType]: "subscription",
        [FacebookEventParameterName.ContentId]: productId,
      },
    });
  } catch (e) {
    console.warn("Meta purchase event failed", e);
  }
}

/** Test helper: forget the cached init so each test starts clean. */
export function resetMetaAdsForTests(): void {
  initPromise = null;
  resetTrackingPermissionForTests();
}
