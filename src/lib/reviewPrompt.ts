import { InAppReview } from "@capacitor-community/in-app-review";
import { isNative } from "@/lib/native";
import { getMeals, type Meal, type MealSource } from "@/lib/profile";

/**
 * Asks for an App Store rating at a moment the user just got value from the app.
 *
 * The prompt is requested right after a meal is saved, when either:
 *  - the user has scanned their second meal (photo), or
 *  - they have been tracking meals for a day or more.
 *
 * Apple decides whether the system dialog is actually shown (it caps it at three
 * times per year per user and never reports back), so we keep our own conservative
 * limits on top: a handful of attempts, spaced months apart. Nothing here ever
 * blocks or fails a meal log.
 */

export const REVIEW_STATE_KEY = "ratioai.review";
export const REVIEW_SCAN_THRESHOLD = 2;
export const REVIEW_TRACKING_MS = 24 * 60 * 60 * 1_000;
export const REVIEW_MAX_REQUESTS = 3;
export const REVIEW_MIN_GAP_MS = 120 * 24 * 60 * 60 * 1_000;
/** Let the "meal logged" confirmation land before the system sheet slides over it. */
export const REVIEW_DELAY_MS = 900;

export type ReviewTrigger = "second-scan" | "day-of-tracking";

interface ReviewState {
  scans: number;
  firstTrackedAt?: string;
  requests: number;
  lastRequestedAt?: string;
}

function readState(): ReviewState {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_STATE_KEY) ?? "null") as Partial<ReviewState> | null;
    return {
      scans: Math.max(0, Number(parsed?.scans) || 0),
      firstTrackedAt: typeof parsed?.firstTrackedAt === "string" ? parsed.firstTrackedAt : undefined,
      requests: Math.max(0, Number(parsed?.requests) || 0),
      lastRequestedAt: typeof parsed?.lastRequestedAt === "string" ? parsed.lastRequestedAt : undefined,
    };
  } catch {
    return { scans: 0, requests: 0 };
  }
}

function writeState(state: ReviewState) {
  try {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage full: worst case we count again next time */
  }
}

/**
 * Update the counters for a just-saved meal and report whether it is a good moment
 * to ask. Pure with respect to the clock and storage it is given, so it is easy to test.
 */
export function evaluateReviewTrigger(
  source: MealSource | undefined,
  now: number = Date.now(),
  meals: Meal[] = getMeals(),
  canRequest = true,
): ReviewTrigger | null {
  const state = readState();

  const isScan = source === "photo";
  // Count from the log too so people who scanned before this feature shipped are not asked a scan late.
  const scansInLog = meals.filter((m) => m.source === "photo").length;
  state.scans = Math.max(state.scans + (isScan ? 1 : 0), scansInLog);

  if (!state.firstTrackedAt) {
    const earlier = meals
      .map((m) => Date.parse(m.loggedAt))
      .filter((t) => Number.isFinite(t) && t < now);
    const hasOlderMeals = meals.length > 1 && earlier.length > 0;
    state.firstTrackedAt = new Date(hasOlderMeals ? Math.min(...earlier) : now).toISOString();
  }

  const lastAsked = state.lastRequestedAt ? Date.parse(state.lastRequestedAt) : null;
  const allowed =
    canRequest &&
    state.requests < REVIEW_MAX_REQUESTS &&
    (lastAsked === null || !Number.isFinite(lastAsked) || now - lastAsked >= REVIEW_MIN_GAP_MS);

  let trigger: ReviewTrigger | null = null;
  if (allowed) {
    if (isScan && state.scans >= REVIEW_SCAN_THRESHOLD) trigger = "second-scan";
    else if (now - Date.parse(state.firstTrackedAt) >= REVIEW_TRACKING_MS) trigger = "day-of-tracking";
  }

  if (trigger) {
    state.requests += 1;
    state.lastRequestedAt = new Date(now).toISOString();
  }
  writeState(state);
  return trigger;
}

/**
 * Call once after a meal was saved successfully. On the web it only keeps the
 * counters; on a device it opens the native rating sheet when a trigger fires.
 */
export function maybeRequestReview(source: MealSource | undefined): ReviewTrigger | null {
  let trigger: ReviewTrigger | null = null;
  try {
    trigger = evaluateReviewTrigger(source, Date.now(), getMeals(), isNative());
  } catch (e) {
    console.warn("review prompt check failed", e);
    return null;
  }
  if (!trigger) return null;

  window.setTimeout(() => {
    InAppReview.requestReview().catch((e) => console.warn("requestReview failed", e));
  }, REVIEW_DELAY_MS);
  return trigger;
}
