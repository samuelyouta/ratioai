import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  completeNativeAuthFromUrl,
  consumeAuthRedirect,
  isAuthFlowPath,
  parseAuthParamsFromUrl,
} from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { syncUserData } from "@/lib/userSync";
import { supabase } from "@/integrations/supabase/client";

const seenAuthUrls = new Set<string>();

/**
 * Completes OAuth when iOS opens com.ratioai.ios://auth-callback?...
 * Ignores stale launch URLs once the user is already inside the app so tab
 * changes are not yanked back to Today.
 */
const AuthDeepLink = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const goNext = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        navigate("/app/signin", { replace: true, state: { error: "Sign-in did not complete. Try again." } });
        return;
      }
      const next = getProfile() ? consumeAuthRedirect() : "/app/welcome";
      navigate(next, { replace: true });
      void syncUserData(userId);
    };

    const finish = async (url: string, source: "launch" | "open") => {
      const { code, error } = parseAuthParamsFromUrl(url);
      if (!code && !error) return;
      if (seenAuthUrls.has(url)) return;

      if (source === "launch" && !isAuthFlowPath(pathRef.current)) {
        seenAuthUrls.add(url);
        return;
      }

      if (inFlight.current) return;
      inFlight.current = true;
      seenAuthUrls.add(url);

      void Browser.close().catch(() => {
        /* already closed */
      });

      const result = await completeNativeAuthFromUrl(url);
      if (result.alreadyHandled) {
        const { data } = await supabase.auth.getUser();
        if (data.user && isAuthFlowPath(pathRef.current)) {
          await goNext();
        }
        inFlight.current = false;
        return;
      }
      if (!result.ok) {
        inFlight.current = false;
        navigate("/app/signin", { replace: true, state: { error: result.error } });
        return;
      }

      await goNext();
      inFlight.current = false;
    };

    let listener: { remove: () => Promise<void> } | undefined;

    CapApp.addListener("appUrlOpen", ({ url }) => {
      void finish(url, "open");
    }).then((handle) => {
      listener = handle;
    });

    CapApp.getLaunchUrl()
      .then((result) => {
        if (result?.url) void finish(result.url, "launch");
      })
      .catch(() => {
        /* no launch URL */
      });

    return () => {
      listener?.remove();
    };
  }, [navigate]);

  return null;
};

export default AuthDeepLink;
