import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile";
import { getLaunchPath, hasAuthCallbackParams } from "@/lib/auth";
import AuthCallback from "@/pages/app/AuthCallback";

/**
 * `/` entry: complete OAuth if ?code= is present, otherwise send the user to
 * welcome → sign-in → app based on onboarding + session.
 */
const AuthEntry = ({ fallbackTo }: { fallbackTo: string }) => {
  const location = useLocation();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (hasAuthCallbackParams(location.search, location.hash)) {
      setTo(null);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setTo(getLaunchPath(Boolean(getProfile()), Boolean(data.session?.user)));
    });
    return () => {
      cancelled = true;
    };
  }, [location.search, location.hash]);

  if (hasAuthCallbackParams(location.search, location.hash)) {
    return <AuthCallback />;
  }

  if (!to) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return <Navigate to={to || fallbackTo} replace />;
};

export default AuthEntry;
