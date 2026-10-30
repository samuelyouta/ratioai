import * as meta from "@/lib/metaAds";
import * as tiktok from "@/lib/tiktokAds";

/**
 * Single entry point for marketing events. Each ad platform reports the same
 * funnel (sign-up, onboarding, checkout, purchase), so call sites stay unaware of
 * which platforms are switched on. Every platform is dormant until configured, and
 * a failure in one never affects the others or the app.
 *
 * Apple Ads attribution does not send events: it is handled by RevenueCat (see appleAds.ts).
 * No health data is ever included.
 */

const REGISTRATION_WINDOW_MS = 10 * 60 * 1_000;
const REGISTERED_KEY_PREFIX = "ratioai.ads.registered.";

export function initAdTracking(): void {
  void meta.initMetaAds();
  void tiktok.initTikTokAds();
}

function fanOut(...calls: Array<() => Promise<void>>): void {
  for (const call of calls) {
    try {
      void call().catch((e) => console.warn("ad event failed", e));
    } catch (e) {
      console.warn("ad event failed", e);
    }
  }
}

export function trackRegistration(method: string): void {
  fanOut(
    () => meta.trackRegistration(method),
    () => tiktok.trackRegistration(method),
  );
}

/** Reports a sign-up once per brand-new account, never on later sign-ins. */
export function trackRegistrationIfNew(user: {
  id: string;
  created_at?: string;
  app_metadata?: { provider?: string };
}): void {
  if (!user.created_at) return;
  if (!meta.isMetaAdsEnabled() && !tiktok.isTikTokAdsEnabled()) return;

  const age = Date.now() - new Date(user.created_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age > REGISTRATION_WINDOW_MS) return;

  const key = `${REGISTERED_KEY_PREFIX}${user.id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    return;
  }
  trackRegistration(user.app_metadata?.provider ?? "email");
}

export function trackOnboardingCompleted(): void {
  fanOut(
    () => meta.trackOnboardingCompleted(),
    () => tiktok.trackOnboardingCompleted(),
  );
}

export function trackCheckoutStarted(productId: string): void {
  fanOut(
    () => meta.trackCheckoutStarted(productId),
    () => tiktok.trackCheckoutStarted(productId),
  );
}

export function trackSubscriptionPurchased(productId: string, amount: number, currency: string): void {
  fanOut(
    () => meta.trackSubscriptionPurchased(productId, amount, currency),
    () => tiktok.trackSubscriptionPurchased(productId, amount, currency),
  );
}
