import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRedirect } from "@/lib/auth";
import { syncUserData } from "@/lib/userSync";
import { getProfile } from "@/lib/profile";

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
      // Prefer stored destination; fall back to welcome if onboarding isn't done yet.
      const next = getProfile() ? consumeAuthRedirect() : "/app/welcome";
      navigate(next, { replace: true });
    };

    const fail = (reason?: string) => {
      if (finished) return;
      finished = true;
      navigate("/app/signin", {
        replace: true,
        state: { error: reason ?? "Sign-in failed. Try again." },
      });
    };

    // Explicitly exchange ?code= when present (covers Site URL fallback to /).
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("exchangeCodeForSession failed", error);
          fail(error.message || "Sign-in failed. Try again.");
          return;
        }
        if (data.session?.user) finish(data.session.user.id);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) finish(session.user.id);
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        finish(session.user.id);
      }
    });

    const timeout = window.setTimeout(() => {
      if (!finished) setMessage("Still working…");
    }, 4000);

    const hardTimeout = window.setTimeout(
      () => fail("Sign-in timed out. Try again."),
      15000,
    );

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
