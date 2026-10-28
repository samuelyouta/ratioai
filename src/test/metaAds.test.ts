import { beforeEach, describe, expect, it, vi } from "vitest";

const att = vi.hoisted(() => ({ requestPermission: vi.fn() }));
const fb = vi.hoisted(() => ({
  enableAdvertiserTracking: vi.fn().mockResolvedValue(undefined),
  disableAdvertiserTracking: vi.fn().mockResolvedValue(undefined),
  initAppEvents: vi.fn().mockResolvedValue(undefined),
  logEvent: vi.fn().mockResolvedValue(undefined),
  logPurchase: vi.fn().mockResolvedValue(undefined),
}));
const platform = vi.hoisted(() => ({ current: "ios" as "ios" | "android" | "web" }));

vi.mock("@capgo/capacitor-app-tracking-transparency", () => ({
  AppTrackingTransparency: att,
}));
vi.mock("@capgo/capacitor-facebook-analytics", async () => {
  const actual = await vi.importActual<typeof import("@capgo/capacitor-facebook-analytics")>(
    "@capgo/capacitor-facebook-analytics",
  );
  return { ...actual, FacebookAnalytics: fb };
});
vi.mock("@/lib/native", () => ({
  getPlatform: () => platform.current,
  isNative: () => platform.current !== "web",
}));

import {
  initMetaAds,
  resetMetaAdsForTests,
  trackCheckoutStarted,
  trackRegistrationIfNew,
  trackSubscriptionPurchased,
} from "@/lib/metaAds";

const flush = async () => {
  await vi.advanceTimersByTimeAsync(2_000);
};

describe("metaAds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    localStorage.clear();
    resetMetaAdsForTests();
    platform.current = "ios";
    att.requestPermission.mockResolvedValue({ status: "authorized" });
  });

  it("does nothing unless VITE_META_ADS_ENABLED is true", async () => {
    const p = initMetaAds();
    await flush();
    expect(await p).toBe(false);
    expect(att.requestPermission).not.toHaveBeenCalled();
    expect(fb.initAppEvents).not.toHaveBeenCalled();
  });

  it("does nothing on web or android even when enabled", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    platform.current = "web";
    expect(await initMetaAds()).toBe(false);
    expect(fb.initAppEvents).not.toHaveBeenCalled();
  });

  it("asks for ATT, enables tracking when authorized, then starts App Events", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    const p = initMetaAds();
    await flush();
    expect(await p).toBe(true);
    expect(att.requestPermission).toHaveBeenCalledTimes(1);
    expect(fb.enableAdvertiserTracking).toHaveBeenCalledTimes(1);
    expect(fb.disableAdvertiserTracking).not.toHaveBeenCalled();
    expect(fb.initAppEvents).toHaveBeenCalledTimes(1);
  });

  it("still starts App Events (without IDFA) when the user denies tracking", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    att.requestPermission.mockResolvedValue({ status: "denied" });
    const p = initMetaAds();
    await flush();
    expect(await p).toBe(true);
    expect(fb.enableAdvertiserTracking).not.toHaveBeenCalled();
    expect(fb.disableAdvertiserTracking).toHaveBeenCalledTimes(1);
    expect(fb.initAppEvents).toHaveBeenCalledTimes(1);
  });

  it("initialises only once across many callers", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    const a = initMetaAds();
    const b = initMetaAds();
    await flush();
    await Promise.all([a, b]);
    expect(fb.initAppEvents).toHaveBeenCalledTimes(1);
  });

  it("logs a subscription purchase with value and currency but no health data", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    const p = trackSubscriptionPurchased("ratioai_pro_yearly", 34.99, "USD");
    await flush();
    await p;
    expect(fb.logPurchase).toHaveBeenCalledWith({
      amount: 34.99,
      currency: "USD",
      params: { fb_content_type: "subscription", fb_content_id: "ratioai_pro_yearly" },
    });
  });

  it("logs checkout start", async () => {
    vi.stubEnv("VITE_META_ADS_ENABLED", "true");
    const p = trackCheckoutStarted("ratioai_pro_monthly");
    await flush();
    await p;
    expect(fb.logEvent).toHaveBeenCalledWith({
      event: "fb_mobile_initiated_checkout",
      params: { fb_content_type: "subscription", fb_content_id: "ratioai_pro_monthly" },
    });
  });

  describe("trackRegistrationIfNew", () => {
    const nowIso = () => new Date().toISOString();

    it("logs CompletedRegistration once for a just-created account", async () => {
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      const user = { id: "u1", created_at: nowIso(), app_metadata: { provider: "apple" } };
      trackRegistrationIfNew(user);
      trackRegistrationIfNew(user);
      await flush();
      expect(fb.logEvent).toHaveBeenCalledTimes(1);
      expect(fb.logEvent).toHaveBeenCalledWith({
        event: "fb_mobile_complete_registration",
        params: { fb_registration_method: "apple" },
      });
    });

    it("ignores returning users with older accounts", async () => {
      vi.stubEnv("VITE_META_ADS_ENABLED", "true");
      const old = new Date(Date.now() - 24 * 3600_000).toISOString();
      trackRegistrationIfNew({ id: "u2", created_at: old });
      await flush();
      expect(fb.logEvent).not.toHaveBeenCalled();
    });

    it("is a no-op when Meta ads are disabled", async () => {
      trackRegistrationIfNew({ id: "u3", created_at: nowIso() });
      await flush();
      expect(fb.logEvent).not.toHaveBeenCalled();
      expect(localStorage.getItem("ratioai.meta.registered.u3")).toBeNull();
    });
  });
});
