// Intelligent Reminders
// Schedules a 2:00 PM local-time check for lunch logging.
// - If user has logged a meal between 11:00 and 14:00, no reminder.
// - Else if protein ≥ 70% of daily target → celebratory tone.
// - Else → nudge tone.
//
// Delivers via the Web Notifications API when permission granted, with a
// sonner toast fallback so the reminder is never silent in-app.

import { toast } from "sonner";
import { getProfile, getTodayMeals, getTodayTotals } from "./profile";

const LAST_FIRED_KEY = "ratioai.reminder.lastFired"; // YYYY-MM-DD
const REMINDER_HOUR = 14; // 2 PM local

export type ReminderTone = "nudge" | "celebrate";

export interface ReminderPayload {
  tone: ReminderTone;
  title: string;
  body: string;
}

/** Decide whether to fire and with what tone. Returns null when no reminder is needed. */
export function evaluateLunchReminder(now: Date = new Date()): ReminderPayload | null {
  const profile = getProfile();
  if (!profile) return null;

  // Did they log lunch already? Treat any meal between 11:00–14:00 local as lunch.
  const lunchLogged = getTodayMeals().some((m) => {
    const h = new Date(m.loggedAt).getHours();
    return h >= 11 && h < 14;
  });
  if (lunchLogged) return null;

  const totals = getTodayTotals();
  const proteinPct = profile.proteinTarget > 0 ? totals.protein / profile.proteinTarget : 0;

  if (proteinPct >= 0.7) {
    return {
      tone: "celebrate",
      title: "So close 🔥",
      body: "Almost at your protein goal! Just one more log to finish the day strong.",
    };
  }

  return {
    tone: "nudge",
    title: "Lunch check-in",
    body: "Haven't seen a meal yet today — snap your plate to stay on track.",
  };
}

function todayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function deliver(payload: ReminderPayload) {
  // Web Notifications when allowed
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: "/favicon.ico",
        tag: "ratioai-lunch-reminder",
      });
    } catch {
      // ignore
    }
  }
  // In-app fallback so the user always sees it
  if (payload.tone === "celebrate") {
    toast.success(payload.title, { description: payload.body, duration: 8000 });
  } else {
    toast(payload.title, { description: payload.body, duration: 8000 });
  }
}

/** Request notification permission (best-effort, no throw). */
export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied" as const;
  }
}

/**
 * Start a lightweight in-app scheduler. Checks every minute whether it's
 * past 2 PM local time and fires the reminder once per day.
 * Returns a cleanup function.
 */
export function startReminderScheduler(): () => void {
  const tick = () => {
    const now = new Date();
    if (now.getHours() < REMINDER_HOUR) return;
    const key = todayKey(now);
    if (localStorage.getItem(LAST_FIRED_KEY) === key) return;
    const payload = evaluateLunchReminder(now);
    if (!payload) return;
    deliver(payload);
    localStorage.setItem(LAST_FIRED_KEY, key);
  };

  // Run once immediately (handles app open after 2 PM) then poll each minute.
  tick();
  const id = window.setInterval(tick, 60 * 1000);

  // Re-check when tab regains focus
  const onVis = () => { if (document.visibilityState === "visible") tick(); };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVis);
  };
}
