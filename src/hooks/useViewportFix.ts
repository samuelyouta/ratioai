import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

/** Re-apply viewport meta when the native app resumes (after OAuth browser, etc.). */
export function useViewportFix() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const apply = () => {
      document.querySelector('meta[name="viewport"]')?.setAttribute("content", VIEWPORT_CONTENT);
      window.scrollTo(0, 0);
    };

    apply();

    const resume = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) apply();
    });

    const resumeAlt = CapApp.addListener("resume", apply);

    return () => {
      void resume.then((h) => h.remove());
      void resumeAlt.then((h) => h.remove());
    };
  }, []);
}
