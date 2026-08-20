import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover";

/** Keep the native WebView viewport at 1× on launch, while allowing pinch zoom. */
export function useViewportFix() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.querySelector('meta[name="viewport"]')?.setAttribute("content", VIEWPORT_CONTENT);
  }, []);
}
