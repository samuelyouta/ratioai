import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { translate } from "@/i18n";
import { isNative } from "@/lib/native";

const OPT_IN_KEY = "ratioai.trial.remind";
const SCHEDULED_KEY = "ratioai.trial.remindFor";
const WEB_AT_KEY = "ratioai.trial.remindAt";
const WEB_FIRED_KEY = "ratioai.trial.remindFired";

/** Stable id so a new trial replaces the previous reminder. */
export const TRIAL_REMINDER_ID = 41021;

/**
 * When to notify before a trial expires.
 * Longer trials get two days of notice; shorter ones get one day.
 * Returns null when the trial is already too close to its end.
 */
export function trialReminderDate(expirationMs: number, now = Date.now()): Date | null {
  const remaining = expirationMs - now;
  if (remaining < 2 * 60 * 60 * 1000) return null;
  const leadMs =
    remaining > 4 * 24 * 60 * 60 * 1000 ? 2 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const at = expirationMs - leadMs;
  if (at <= now + 60_000) return null;
  return new Date(at);
}

/** Ask for notification permission and remember that this person wants the trial reminder. */
export async function enableTrialReminders(): Promise<"granted" | "denied" | "unsupported"> {
  try {
    localStorage.setItem(OPT_IN_KEY, "1");
  } catch {
    /* still try to ask for permission */
  }

  if (!isNative()) {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      const result = await Notification.requestPermission();
      return result === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      perm = await LocalNotifications.requestPermissions();
    }
    return perm.display === "granted" ? "granted" : "denied";
  } catch (e) {
    console.warn("Trial reminder permission failed", e);
    return "denied";
  }
}

function deliverWeb(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "ratioai-trial-reminder" });
    } catch {
      /* ignore */
    }
  }
  toast(title, { description: body, duration: 8000 });
}

/**
 * Schedule the "your free trial ends soon" notification.
 * No-ops until the person has opted in on the reminder screen.
 */
export async function scheduleTrialEndReminder(expirationMs: number): Promise<void> {
  let optedIn = false;
  try {
    optedIn = localStorage.getItem(OPT_IN_KEY) === "1";
    if (localStorage.getItem(SCHEDULED_KEY) === String(expirationMs)) return;
  } catch {
    return;
  }
  if (!optedIn) return;

  const at = trialReminderDate(expirationMs);
  if (!at) return;

  const title = translate("trial.notif.title");
  const body = translate("trial.notif.body");

  if (!isNative()) {
    try {
      localStorage.setItem(WEB_AT_KEY, String(at.getTime()));
      localStorage.setItem(SCHEDULED_KEY, String(expirationMs));
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    await LocalNotifications.cancel({ notifications: [{ id: TRIAL_REMINDER_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TRIAL_REMINDER_ID,
          title,
          body,
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
    localStorage.setItem(SCHEDULED_KEY, String(expirationMs));
  } catch (e) {
    console.warn("Could not schedule trial reminder", e);
  }
}

/** Web fallback: fire the stored reminder if its time has passed while the app is open. */
export function startTrialReminderWatcher(): () => void {
  const tick = () => {
    let at = 0;
    let fired = "";
    try {
      at = Number(localStorage.getItem(WEB_AT_KEY) || 0);
      fired = localStorage.getItem(WEB_FIRED_KEY) || "";
    } catch {
      return;
    }
    if (!at || fired === String(at) || Date.now() < at) return;
    deliverWeb(translate("trial.notif.title"), translate("trial.notif.body"));
    try {
      localStorage.setItem(WEB_FIRED_KEY, String(at));
    } catch {
      /* ignore */
    }
  };

  tick();
  const id = window.setInterval(tick, 60 * 1000);
  const onVis = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVis);
  };
}
