import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate that only lets signed-in users through.
 * Session comes from AuthProvider so changing tabs does not remount a loading spinner.
 */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { status } = useAuth();

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
