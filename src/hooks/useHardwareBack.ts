import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App, type BackButtonListenerEvent } from "@capacitor/app";
import { isNative } from "@/lib/native";

/**
 * Routes from which the hardware back button should EXIT the app
 * instead of navigating within React Router. These are the "root" screens
 * a user lands on; pressing back from anywhere else pops the stack.
 */
const ROOT_ROUTES = new Set<string>([
  "/",
  "/waitlist",
  "/app",
  "/app/today",
  "/app/welcome",
  "/app/onboarding/goal",
]);

/**
 * Wires the Android hardware back button (and the iOS edge-swipe gesture
 * surfaced via the same Capacitor event) into React Router.
 *
 * Behavior:
 *  1. If a modal/dialog/sheet is open, close it (dispatch Escape).
 *  2. Else if we're on a root route, ask Capacitor to minimize/exit the app.
 *  3. Else navigate(-1).
 *
 * No-op on the web — the browser's native back button already does the right thing.
 */
export const useHardwareBack = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNative()) return;

    let remove: (() => void) | undefined;

    const handler = (_e: BackButtonListenerEvent) => {
      // 1. Close any open Radix overlay first.
      const openOverlay = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-popper-content-wrapper] [data-state="open"]',
      );
      if (openOverlay) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        return;
      }

      // 2. Root route → exit the app.
      if (ROOT_ROUTES.has(location.pathname)) {
        App.exitApp();
        return;
      }

      // 3. Otherwise pop the in-app history stack.
      navigate(-1);
    };

    App.addListener("backButton", handler).then((sub) => {
      remove = () => sub.remove();
    });

    return () => {
      remove?.();
    };
  }, [navigate, location.pathname]);
};
