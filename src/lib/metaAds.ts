import { AppTrackingTransparency } from "@capgo/capacitor-app-tracking-transparency";
import {
  FacebookAnalytics,
  FacebookEventName,
  FacebookEventParameterName,
} from "@capgo/capacitor-facebook-analytics";
import { getPlatform } from "@/lib/native";

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

const ATT_PROMPT_DELAY_MS = 1_500;
const REGISTRATION_WINDOW_MS = 10 * 60 * 1_000;
const REGISTERED_KEY_PREFIX = "ratioai.meta.registered.";

let initPromise: Promise<boolean> | null = null;

export function isMetaAdsEnabled(): boolean {
  return import.meta.env.VITE_META_ADS_ENABLED === "true" && getPlatform() === "ios";
}

async function startMetaSdk(): Promise<boolean> {
  try {
    // The ATT dialog only appears once the app is active, not during launch.
    await new Promise((resolve) => setTimeout(resolve, ATT_PROMPT_DELAY_MS));

    let authorized = false;
    try {
      const { status } = await AppTrackingTransparency.requestPermission();
      authorized = status === "authorized";
    } catch (e) {
      console.warn("ATT request failed", e);
    }

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

/** Logs CompletedRegistration once per brand-new account, never on later sign-ins. */
export function trackRegistrationIfNew(user: {
  id: string;
  created_at?: string;
  app_metadata?: { provider?: string };
}): void {
  if (!isMetaAdsEnabled() || !user.created_at) return;
  const age = Date.now() - new Date(user.created_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age > REGISTRATION_WINDOW_MS) return;

  const key = `${REGISTERED_KEY_PREFIX}${user.id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    return;
  }
  void trackRegistration(user.app_metadata?.provider ?? "email");
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
}
