import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRedirect } from "@/lib/auth";
import { syncUserData } from "@/lib/userSync";

/**
 * Landing page after OAuth or email magic-link redirects.
 * Waits for Supabase to exchange the auth code, syncs local data, then
 * sends the user to their intended destination.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let finished = false;

    const finish = async (userId: string) => {
      if (finished) return;
      finished = true;
      await syncUserData(userId);
      navigate(consumeAuthRedirect(), { replace: true });
    };

    const fail = (reason?: string) => {
      if (finished) return;
      finished = true;
      navigate("/app/signin", {
        replace: true,
        state: { error: reason ?? "Sign-in failed. Try again." },
      });
    };

    // PKCE / magic-link: Supabase processes the URL automatically.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) finish(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        finish(session.user.id);
      }
    });

    const timeout = window.setTimeout(() => {
      if (!finished) {
        setMessage("Still working…");
      }
    }, 4000);

    const hardTimeout = window.setTimeout(() => fail("Sign-in timed out. Try again."), 15000);

    return () => {
      finished = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
      clearTimeout(hardTimeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default AuthCallback;
