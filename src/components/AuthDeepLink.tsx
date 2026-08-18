import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { authCallbackPathFromUrl } from "@/lib/auth";

/**
 * Routes native custom-scheme / universal-link auth returns into /app/auth/callback.
 * Required for email magic links and browser OAuth (com.ratioai.ios://auth-callback?...).
 */
const AuthDeepLink = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = (url: string) => {
      const path = authCallbackPathFromUrl(url);
      if (!path) return;
      void Browser.close().catch(() => {
        /* browser may already be closed */
      });
      navigate(path, { replace: true });
    };

    let listener: { remove: () => Promise<void> } | undefined;

    CapApp.addListener("appUrlOpen", ({ url }) => handleUrl(url)).then((handle) => {
      listener = handle;
    });

    CapApp.getLaunchUrl()
      .then((result) => {
        if (result?.url) handleUrl(result.url);
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
