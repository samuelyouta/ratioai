import { useEffect, useMemo, useRef, useState } from "react";
import { NATIVE_AUTH_CALLBACK } from "@/lib/auth";

/**
 * Hosted on Vercel. Supabase redirects the in-app browser here with ?code=.
 * We hand the code to the iOS app over the custom scheme.
 *
 * Safari increasingly blocks scheme navigation that is not tied to a user
 * gesture, which left iPad reviewers stranded on this page. So we try several
 * mechanisms, retry when the page regains focus, and always show a large
 * manual button as the guaranteed fallback.
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

  const attempts = useRef(0);

  useEffect(() => {
    const open = () => {
      attempts.current += 1;
      const link = document.createElement("a");
      link.href = target;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Direct assignment catches the cases where a synthetic click is ignored.
      try {
        window.location.href = target;
      } catch {
        /* blocked — the manual button below still works */
      }
    };

    open();
    const retry = window.setTimeout(open, 1_200);

    const onVisible = () => {
      if (document.visibilityState === "visible" && attempts.current < 4) open();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [target]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-base text-foreground text-center font-semibold">
        Return to RatioAi to finish signing in
      </p>
      <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
        {hasCode
          ? "Tap the button below to go back to the app. Do not close this window until the app reopens."
          : "Waiting for sign-in details…"}
      </p>
      <a
        href={target}
        className="mt-2 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-8 py-4 text-base font-semibold w-full max-w-xs"
      >
        Open RatioAi
      </a>
    </div>
  );
};

export default NativeAuthBridge;
