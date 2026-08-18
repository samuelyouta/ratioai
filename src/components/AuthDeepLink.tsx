import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { authCallbackPathFromUrl } from "@/lib/auth";

/**
 * Routes native OAuth / magic-link returns into /app/auth/callback.
 * Uses a hard navigation so Supabase PKCE (detectSessionInUrl) runs on load.
 */
const AuthDeepLink = () => {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = (url: string) => {
      const path = authCallbackPathFromUrl(url);
      if (!path || handledRef.current === url) return;
      handledRef.current = url;

      void Browser.close().catch(() => {
        /* browser may already be closed */
      });

      // Full reload ensures window.location has ?code= when Supabase initializes (PKCE exchange).
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const target = base ? `${base}${normalizedPath}` : normalizedPath;
      window.location.replace(target);
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
  }, []);

  return null;
};

export default AuthDeepLink;
