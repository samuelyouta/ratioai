import { useEffect } from "react";
import { NATIVE_AUTH_CALLBACK } from "@/lib/auth";

/**
 * Hosted on Vercel. Supabase OAuth redirects here from the in-app browser,
 * then this page immediately deep-links back into the iOS app with the auth code.
 */
const NativeAuthBridge = () => {
  useEffect(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const error = new URLSearchParams(search).get("error_description")
      || new URLSearchParams(search).get("error");

    if (error) {
      window.location.replace(
        `${NATIVE_AUTH_CALLBACK}?error=${encodeURIComponent(error)}`,
      );
      return;
    }

    const target = `${NATIVE_AUTH_CALLBACK}${search}${hash}`;

    // Try custom scheme immediately; retry once for slow WebViews.
    window.location.replace(target);
    const retry = window.setTimeout(() => {
      window.location.href = target;
    }, 600);

    return () => clearTimeout(retry);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground text-center">Returning to RatioAi…</p>
      <p className="text-[11px] text-muted-foreground text-center max-w-xs">
        If nothing happens, switch back to the RatioAi app.
      </p>
    </div>
  );
};

export default NativeAuthBridge;
