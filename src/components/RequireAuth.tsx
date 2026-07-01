import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate that only lets signed-in users through.
 * Placed AFTER RequireOnboarding, so unauthenticated users who finished
 * onboarding are pushed to /app/signin (with the intended path preserved).
 */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let unmounted = false;
    supabase.auth.getSession().then(({ data }) => {
      if (unmounted) return;
      setStatus(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "in" : "out");
    });
    return () => {
      unmounted = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "out") {
    return (
      <Navigate
        to="/app/signin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
