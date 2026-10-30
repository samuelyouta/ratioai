import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerCloudSyncListener } from "@/lib/cloudSyncTrigger";
import { scheduleCloudPush, syncUserData } from "@/lib/userSync";
import { trackRegistrationIfNew } from "@/lib/adEvents";

/**
 * Keeps authenticated users' local profile + meals in sync with cloud tables.
 * Runs on sign-in and when an existing session is restored.
 */
const AuthSync = () => {
  useEffect(() => {
    let active = true;

    const runSync = async (userId: string) => {
      if (!active) return;
      await syncUserData(userId);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) runSync(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")
      ) {
        runSync(session.user.id);
      }
      if (session?.user && event === "SIGNED_IN") {
        trackRegistrationIfNew(session.user);
      }
    });

    const unregister = registerCloudSyncListener(() => scheduleCloudPush());

    // Pick up meals logged on another device when the app comes back to the foreground.
    let lastResync = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastResync < 60_000) return;
      lastResync = Date.now();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) runSync(session.user.id);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      unregister();
    };
  }, []);

  return null;
};

export default AuthSync;
