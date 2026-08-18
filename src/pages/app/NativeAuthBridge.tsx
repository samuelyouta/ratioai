import { useEffect, useMemo, useState } from "react";
import { NATIVE_AUTH_CALLBACK } from "@/lib/auth";

/**
 * Hosted on Vercel. Supabase redirects the in-app browser here with ?code=.
 * We open the iOS app once via custom scheme (no retry loop — that blinks forever).
 */
const NativeAuthBridge = () => {
  const [target] = useState(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const error =
      new URLSearchParams(search).get("error_description") ||
      new URLSearchParams(search).get("error");
    if (error) {
      return `${NATIVE_AUTH_CALLBACK}?error=${encodeURIComponent(error)}`;
    }
    return `${NATIVE_AUTH_CALLBACK}${search}${hash}`;
  });

  const hasCode = useMemo(
    () => new URLSearchParams(window.location.search).has("code"),
    [],
  );

  useEffect(() => {
    const link = document.createElement("a");
    link.href = target;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [target]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-foreground text-center font-medium">Return to RatioAi to finish signing in</p>
      <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
        {hasCode
          ? "Tap the button below if the app doesn’t open automatically."
          : "Waiting for sign-in details…"}
      </p>
      <a
        href={target}
        className="mt-2 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-5 py-3 text-sm font-semibold"
      >
        Open RatioAi
      </a>
    </div>
  );
};

export default NativeAuthBridge;
