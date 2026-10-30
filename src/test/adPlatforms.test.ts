import { beforeEach, describe, expect, it, vi } from "vitest";

const att = vi.hoisted(() => ({ requestPermission: vi.fn() }));
const tt = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));
const fb = vi.hoisted(() => ({
  enableAdvertiserTracking: vi.fn().mockResolvedValue(undefined),
  disableAdvertiserTracking: vi.fn().mockResolvedValue(undefined),
  initAppEvents: vi.fn().mockResolvedValue(undefined),
  logEvent: vi.fn().mockResolvedValue(undefined),
  logPurchase: vi.fn().mockResolvedValue(undefined),
}));
const rc = vi.hoisted(() => ({
  enableAdServicesAttributionTokenCollection: vi.fn().mockResolvedValue(undefined),
}));
const platform = vi.hoisted(() => ({ current: "ios" as "ios" | "android" | "web" }));

vi.mock("@capgo/capacitor-app-tracking-transparency", () => ({ AppTrackingTransparency: att }));
vi.mock("@capgo/capacitor-facebook-analytics", async () => {
  const actual = await vi.importActual<typeof import("@capgo/capacitor-facebook-analytics")>(
    "@capgo/capacitor-facebook-analytics",
  );
  return { ...actual, FacebookAnalytics: fb };
});
vi.mock("@/lib/tiktokPlugin", () => ({ TikTokEvents: tt }));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: rc }));
vi.mock("@/lib/native", () => ({
  getPlatform: () => platform.current,
  isNative: () => platform.current !== "web",
}));

import { resetMetaAdsForTests } from "@/lib/metaAds";
import { resetTikTokAdsForTests, initTikTokAds, isTikTokAdsEnabled } from "@/lib/tiktokAds";
import { enableAppleAdsAttribution, isAppleAdsEnabled } from "@/lib/appleAds";
import {
  initAdTracking,
  trackCheckoutStarted,
  trackOnboardingCompleted,
  trackRegistrationIfNew,
  trackSubscriptionPurchased,
} from "@/lib/adEvents";

const flush = () => vi.advanceTimersByTimeAsync(2_000);

function enableTikTok() {
  vi.stubEnv("VITE_TIKTOK_ADS_ENABLED", "true");
  vi.stubEnv("VITE_TIKTOK_APP_ID", "7000000000000000000");
  vi.stubEnv("VITE_TIKTOK_ACCESS_TOKEN", "token");
}

describe("ad platforms", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    localStorage.clear();
    resetMetaAdsForTests();
    resetTikTokAdsForTests();
    platform.current = "ios";
    att.requestPermission.mockResolvedValue({ status: "authorized" });
  });

  describe("TikTok", () => {
    it("is dormant unless enabled with both ids on iOS", async () => {
      expect(isTikTokAdsEnabled()).toBe(false);
      vi.stubEnv("VITE_TIKTOK_ADS_ENABLED", "true");
      expect(isTikTokAdsEnabled()).toBe(false);
      vi.stubEnv("VITE_TIKTOK_APP_ID", "1");
      vi.stubEnv("VITE_TIKTOK_ACCESS_TOKEN", "t");
      expect(isTikTokAdsEnabled()).toBe(true);
      platform.current = "web";
      expect(isTikTokAdsEnabled()).toBe(false);
      expect(await initTikTokAds()).toBe(false);
      expect(tt.initialize).not.toHaveBeenCalled();
    });

    it("starts after the ATT answer, only once, with the App Store id", async () => {
      enableTikTok();
      const [a, b] = [initTikTokAds(), initTikTokAds()];
      expect(att.requestPermission).not.toHaveBeenCalled();
      await flush();
      expect(await a).toBe(true);
      expect(await b).toBe(true);
      expect(att.requestPermission).toHaveBeenCalledTimes(1);
      expect(tt.initialize).toHaveBeenCalledTimes(1);
      expect(tt.initialize).toHaveBeenCalledWith({
        accessToken: "token",
        tiktokAppId: "7000000000000000000",
        appId: "6787262904",
        debug: false,
      });
    });

    it("still starts when the user declines tracking", async () => {
      enableTikTok();
      att.requestPermission.mockResolvedValue({ status: "denied" });
      const p = initTikTokAds();
      await flush();
      expect(await p).toBe(true);
    });

    it("survives a native start failure without throwing from events", async () => {
      enableTikTok();
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      tt.initialize.mockRejectedValueOnce(new Error("boom"));
      trackOnboardingCompleted();
      await flush();
      expect(tt.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe("shared ATT prompt", () => {
    it("asks once even when Meta and TikTok are both on", async () => {
      enableTikTok();
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      initAdTracking();
      await flush();
      expect(att.requestPermission).toHaveBeenCalledTimes(1);
      expect(fb.initAppEvents).toHaveBeenCalledTimes(1);
      expect(tt.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe("funnel events", () => {
    it("sends the same funnel to Meta and TikTok with no health data", async () => {
      enableTikTok();
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");

      trackOnboardingCompleted();
      trackCheckoutStarted("ratioai_pro_yearly");
      trackSubscriptionPurchased("ratioai_pro_yearly", 39.99, "usd");
      await flush();

      expect(tt.trackEvent).toHaveBeenCalledWith({ event: "CompleteTutorial", properties: undefined });
      expect(tt.trackEvent).toHaveBeenCalledWith({
        event: "Checkout",
        properties: { content_type: "subscription", content_id: "ratioai_pro_yearly" },
      });
      expect(tt.trackEvent).toHaveBeenCalledWith({
        event: "Purchase",
        properties: {
          content_type: "subscription",
          content_id: "ratioai_pro_yearly",
          currency: "USD",
          value: "39.99",
        },
      });
      expect(fb.logPurchase).toHaveBeenCalledWith(expect.objectContaining({ amount: 39.99, currency: "usd" }));
      expect(fb.logEvent).toHaveBeenCalledTimes(2);
    });

    it("still reaches Meta when TikTok is off, and vice versa", async () => {
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      trackOnboardingCompleted();
      await flush();
      expect(fb.logEvent).toHaveBeenCalledTimes(1);
      expect(tt.trackEvent).not.toHaveBeenCalled();
    });

    it("a failing platform does not stop the other", async () => {
      enableTikTok();
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      fb.logEvent.mockRejectedValueOnce(new Error("meta down"));
      trackOnboardingCompleted();
      await flush();
      expect(tt.trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("registration", () => {
    const nowIso = () => new Date().toISOString();

    it("is reported once per new account to every enabled platform", async () => {
      enableTikTok();
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      const user = { id: "u1", created_at: nowIso(), app_metadata: { provider: "apple" } };
      trackRegistrationIfNew(user);
      trackRegistrationIfNew(user);
      await flush();
      expect(fb.logEvent).toHaveBeenCalledTimes(1);
      expect(tt.trackEvent).toHaveBeenCalledTimes(1);
      expect(tt.trackEvent).toHaveBeenCalledWith({
        event: "Registration",
        properties: { registration_method: "apple" },
      });
    });

    it("ignores returning users and does nothing when no platform is enabled", async () => {
      enableTikTok();
      trackRegistrationIfNew({ id: "u2", created_at: new Date(Date.now() - 86_400_000).toISOString() });
      vi.unstubAllEnvs();
      trackRegistrationIfNew({ id: "u3", created_at: nowIso() });
      await flush();
      expect(tt.trackEvent).not.toHaveBeenCalled();
      expect(localStorage.getItem("ratioai.ads.registered.u3")).toBeNull();
    });
  });

  describe("Apple Ads", () => {
    it("is dormant unless enabled on iOS", async () => {
      expect(isAppleAdsEnabled()).toBe(false);
      expect(await enableAppleAdsAttribution()).toBe(false);
      vi.stubEnv("VITE_APPLE_ADS_ENABLED", "true");
      platform.current = "web";
      expect(await enableAppleAdsAttribution()).toBe(false);
      expect(rc.enableAdServicesAttributionTokenCollection).not.toHaveBeenCalled();
    });

    it("turns on AdServices attribution through RevenueCat, no ATT needed", async () => {
      vi.stubEnv("VITE_APPLE_ADS_ENABLED", "true");
      expect(await enableAppleAdsAttribution()).toBe(true);
      expect(rc.enableAdServicesAttributionTokenCollection).toHaveBeenCalledTimes(1);
      expect(att.requestPermission).not.toHaveBeenCalled();
    });

    it("does not throw when the SDK call fails", async () => {
      vi.stubEnv("VITE_APPLE_ADS_ENABLED", "true");
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      rc.enableAdServicesAttributionTokenCollection.mockRejectedValueOnce(new Error("nope"));
      expect(await enableAppleAdsAttribution()).toBe(false);
    });
  });
});
