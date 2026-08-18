import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRedirect } from "@/lib/auth";
import { syncUserData } from "@/lib/userSync";
import { getProfile } from "@/lib/profile";

/**
 * Landing page after OAuth or email magic-link redirects.
 * Exchanges the auth code, syncs local data, then routes into the app.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Signing you in…");
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const authError = params.get("error_description") || params.get("error");

    const finish = (userId: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const next = getProfile() ? consumeAuthRedirect() : "/app/welcome";
      navigate(next, { replace: true });
      void syncUserData(userId);
    };

    const fail = (reason: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      navigate("/app/signin", {
        replace: true,
        state: { error: reason },
      });
    };

    if (authError) {
      fail(authError);
      return;
    }

    let hardTimeout: number | undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        finish(session.user.id);
      }
    });

    const run = async () => {
      // getSession() waits for Supabase init — on a full reload this includes detectSessionInUrl PKCE exchange.
      const { data: initial } = await supabase.auth.getSession();
      if (initial.session?.user) {
        finish(initial.session.user.id);
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (data.session?.user) {
          finish(data.session.user.id);
          return;
        }
        if (error) {
          const { data: retry } = await supabase.auth.getSession();
          if (retry.session?.user) {
            finish(retry.session.user.id);
            return;
          }
          fail(error.message || "Sign-in failed. Try again.");
          return;
        }
      }

      hardTimeout = window.setTimeout(async () => {
        if (doneRef.current) return;
        setMessage("Still working…");
        const { data: last } = await supabase.auth.getSession();
        if (last.session?.user) {
          finish(last.session.user.id);
        } else {
          fail("Sign-in timed out. Try again.");
        }
      }, 12000);
    };

    void run();

    return () => {
      sub.subscription.unsubscribe();
      if (hardTimeout) clearTimeout(hardTimeout);
    };
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default AuthCallback;
