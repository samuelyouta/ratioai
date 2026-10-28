import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const review = vi.hoisted(() => ({ requestReview: vi.fn().mockResolvedValue(undefined) }));
const platform = vi.hoisted(() => ({ native: true }));

vi.mock("@capacitor-community/in-app-review", () => ({ InAppReview: review }));
vi.mock("@/lib/native", () => ({
  isNative: () => platform.native,
  getPlatform: () => (platform.native ? "ios" : "web"),
}));

import {
  REVIEW_DELAY_MS,
  evaluateReviewTrigger,
  maybeRequestReview,
} from "@/lib/reviewPrompt";
import { saveMeal, type Meal } from "@/lib/profile";

const DAY = 24 * 60 * 60 * 1_000;
const T0 = Date.parse("2026-05-20T12:00:00.000Z");

const meal = (id: string, source: Meal["source"], loggedAt = new Date(T0).toISOString()): Meal => ({
  id,
  loggedAt,
  title: id,
  icon: "",
  items: [],
  totalCalories: 400,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  hiddenIngredient: null,
  source,
  verified: true,
});

const log = (source: Meal["source"], at = T0) => {
  saveMeal(meal(`m${Math.random()}`, source, new Date(at).toISOString()));
};

describe("review prompt", () => {
  beforeEach(() => {
    localStorage.clear();
    platform.native = true;
    review.requestReview.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("does not ask after the first scan", () => {
    log("photo");
    expect(evaluateReviewTrigger("photo", T0)).toBeNull();
  });

  it("asks right after the second scanned meal", () => {
    log("photo");
    evaluateReviewTrigger("photo", T0);
    log("photo", T0 + 60_000);
    expect(evaluateReviewTrigger("photo", T0 + 60_000)).toBe("second-scan");
  });

  it("only counts scans, not manual or described meals", () => {
    log("manual");
    evaluateReviewTrigger("manual", T0);
    log("voice");
    evaluateReviewTrigger("voice", T0 + 1000);
    log("photo");
    expect(evaluateReviewTrigger("photo", T0 + 2000)).toBeNull();
  });

  it("asks once the user has been tracking for a day", () => {
    log("manual");
    expect(evaluateReviewTrigger("manual", T0)).toBeNull();
    log("manual", T0 + DAY + 1000);
    expect(evaluateReviewTrigger("manual", T0 + DAY + 1000)).toBe("day-of-tracking");
  });

  it("does not ask again straight after asking", () => {
    log("photo");
    evaluateReviewTrigger("photo", T0);
    log("photo");
    expect(evaluateReviewTrigger("photo", T0 + 1000)).toBe("second-scan");
    log("photo");
    expect(evaluateReviewTrigger("photo", T0 + 2000)).toBeNull();
    expect(evaluateReviewTrigger("manual", T0 + 3 * DAY)).toBeNull();
  });

  it("asks again after the cool-down, at most three times", () => {
    log("photo");
    log("photo");
    const times = [T0, T0 + 130 * DAY, T0 + 260 * DAY, T0 + 390 * DAY];
    const results = times.map((t) => evaluateReviewTrigger("photo", t));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(results[3]).toBeNull();
  });

  it("recognises people who scanned before this feature existed", () => {
    log("photo");
    log("photo");
    log("photo");
    expect(evaluateReviewTrigger("manual", T0)).toBeNull();
    expect(evaluateReviewTrigger("photo", T0)).toBe("second-scan");
  });

  it("opens the native rating sheet after a short delay on a device", () => {
    log("photo");
    maybeRequestReview("photo");
    log("photo");
    expect(maybeRequestReview("photo")).toBe("second-scan");
    expect(review.requestReview).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVIEW_DELAY_MS);
    expect(review.requestReview).toHaveBeenCalledTimes(1);
  });

  it("never opens anything on the web and does not use up an ask", () => {
    platform.native = false;
    log("photo");
    maybeRequestReview("photo");
    log("photo");
    expect(maybeRequestReview("photo")).toBeNull();
    vi.advanceTimersByTime(REVIEW_DELAY_MS * 2);
    expect(review.requestReview).not.toHaveBeenCalled();

    platform.native = true;
    expect(maybeRequestReview("photo")).toBe("second-scan");
  });

  it("survives a failing native call and corrupt state", () => {
    localStorage.setItem("ratioai.review", "{nope");
    review.requestReview.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    log("photo");
    log("photo");
    expect(() => {
      maybeRequestReview("photo");
      vi.advanceTimersByTime(REVIEW_DELAY_MS);
    }).not.toThrow();
  });
});
