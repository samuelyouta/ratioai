import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerCloudSyncListener } from "@/lib/cloudSyncTrigger";
import { scheduleCloudPush, syncUserData } from "@/lib/userSync";
import { trackRegistrationIfNew } from "@/lib/metaAds";

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

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      unregister();
    };
  }, []);

  return null;
};

export default AuthSync;
