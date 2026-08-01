import { Navigate, useLocation } from "react-router-dom";
import { hasAuthCallbackParams } from "@/lib/auth";
import AuthCallback from "@/pages/app/AuthCallback";

/**
 * Entry route that preserves Supabase OAuth returns.
 * When Supabase falls back to the Site URL (often `/`) with ?code=,
 * complete the session instead of stripping the query via Navigate.
 */
const AuthEntry = ({ fallbackTo }: { fallbackTo: string }) => {
  const location = useLocation();

  if (hasAuthCallbackParams(location.search, location.hash)) {
    return <AuthCallback />;
  }

  return <Navigate to={fallbackTo} replace />;
};

export default AuthEntry;
