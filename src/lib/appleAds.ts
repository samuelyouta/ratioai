import { Purchases } from "@revenuecat/purchases-capacitor";
import { getPlatform } from "@/lib/native";

/**
 * Apple Ads (formerly Apple Search Ads) attribution.
 *
 * Apple attributes installs with its AdServices framework, which needs no
 * App Tracking Transparency consent and no IDFA. RevenueCat collects the
 * attribution token on the device, resolves it with Apple, and then shows
 * campaign, ad group and keyword on each customer and on revenue charts.
 *
 * Dormant unless `VITE_APPLE_ADS_ENABLED=true` and the app runs on iOS.
 * Must be called after `Purchases.configure`.
 */

export function isAppleAdsEnabled(): boolean {
  return import.meta.env.VITE_APPLE_ADS_ENABLED === "true" && getPlatform() === "ios";
}

export async function enableAppleAdsAttribution(): Promise<boolean> {
  if (!isAppleAdsEnabled()) return false;
  try {
    await Purchases.enableAdServicesAttributionTokenCollection();
    return true;
  } catch (e) {
    console.warn("Apple Ads attribution failed", e);
    return false;
  }
}
