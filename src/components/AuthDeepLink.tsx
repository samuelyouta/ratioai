import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { completeNativeAuthFromUrl, consumeAuthRedirect, parseAuthParamsFromUrl } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { syncUserData } from "@/lib/userSync";
import { supabase } from "@/integrations/supabase/client";

/**
 * Completes OAuth when iOS opens com.ratioai.ios://auth-callback?...
 * Exchanges the PKCE code in this WebView (where the verifier is stored).
 * Never full-reloads — that re-reads getLaunchUrl and loops on "Signing you in…".
 */
const AuthDeepLink = () => {
  const navigate = useNavigate();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const goNext = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      const next = getProfile() ? consumeAuthRedirect() : "/app/welcome";
      navigate(next, { replace: true });
      if (userId) void syncUserData(userId);
    };

    const finish = async (url: string) => {
      const { code, error } = parseAuthParamsFromUrl(url);
      if (!code && !error) return;
      if (inFlight.current) return;
      inFlight.current = true;

      void Browser.close().catch(() => {
        /* already closed */
      });

      const result = await completeNativeAuthFromUrl(url);
      if (result.alreadyHandled) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) await goNext();
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
      void finish(url);
    }).then((handle) => {
      listener = handle;
    });

    CapApp.getLaunchUrl()
      .then((result) => {
        if (result?.url) void finish(result.url);
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
