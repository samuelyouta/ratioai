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

function trackRegistration(method: string): void {
  fanOut(
    () => meta.trackRegistration(method),
    () => tiktok.trackRegistration(method),
  );
}

/** Reports a sign-up once per brand-new account. Returns true when it was sent. */
function trackRegistrationIfNew(user: {
  id: string;
  created_at?: string;
  app_metadata?: { provider?: string };
}): boolean {
  if (!user.created_at) return false;
  if (!meta.isMetaAdsEnabled() && !tiktok.isTikTokAdsEnabled()) return false;

  const age = Date.now() - new Date(user.created_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age > REGISTRATION_WINDOW_MS) return false;

  const key = `${REGISTERED_KEY_PREFIX}${user.id}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch {
    return false;
  }
  trackRegistration(user.app_metadata?.provider ?? "email");
  return true;
}

const signedInThisLaunch = new Set<string>();

/**
 * Call on every sign-in event. Links the account to TikTok, then reports a
 * sign-up for brand-new accounts or a login (at most once per app launch) for
 * returning ones.
 */
export function trackSignIn(user: {
  id: string;
  created_at?: string;
  app_metadata?: { provider?: string };
}): void {
  fanOut(() => tiktok.identify(user.id));
  if (trackRegistrationIfNew(user)) {
    signedInThisLaunch.add(user.id);
    return;
  }
  if (signedInThisLaunch.has(user.id)) return;
  signedInThisLaunch.add(user.id);
  fanOut(() => tiktok.trackLogin());
}

export function trackSignOut(): void {
  signedInThisLaunch.clear();
  fanOut(() => tiktok.logout());
}

export function trackOnboardingCompleted(): void {
  fanOut(
    () => meta.trackOnboardingCompleted(),
    () => tiktok.trackOnboardingCompleted(),
  );
}

export function trackCheckoutStarted(details: tiktok.ProductDetails): void {
  fanOut(
    () => meta.trackCheckoutStarted(details.productId),
    () => tiktok.trackCheckoutStarted(details),
  );
}

export function trackSubscriptionPurchased(details: tiktok.ProductDetails): void {
  fanOut(
    () => meta.trackSubscriptionPurchased(details.productId, details.amount, details.currency),
    () => tiktok.trackSubscriptionPurchased(details),
  );
}

export function resetAdEventsForTests(): void {
  signedInThisLaunch.clear();
}
