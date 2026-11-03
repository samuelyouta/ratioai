import { AppTrackingTransparency } from "@capgo/capacitor-app-tracking-transparency";

/**
 * One App Tracking Transparency prompt shared by every ad SDK (Meta, TikTok).
 * iOS only ever shows the dialog once, but each SDK needs to know the answer
 * before it starts, so they all wait on the same promise.
 */

const ATT_PROMPT_DELAY_MS = 1_500;

let pending: Promise<boolean> | null = null;

/** Resolves to true when the user allowed tracking. Never rejects. */
export function requestTrackingPermission(): Promise<boolean> {
  if (!pending) {
    pending = (async () => {
      // The ATT dialog only appears once the app is active, not during launch.
      await new Promise((resolve) => setTimeout(resolve, ATT_PROMPT_DELAY_MS));
      try {
        const { status } = await AppTrackingTransparency.requestPermission();
        return status === "authorized";
      } catch (e) {
        console.warn("ATT request failed", e);
        return false;
      }
    })();
  }
  return pending;
}

export function resetTrackingPermissionForTests(): void {
  pending = null;
}
