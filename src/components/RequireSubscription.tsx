import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Gate that only lets subscribed users through (native App Store builds).
 * Web builds bypass unless VITE_SUBSCRIPTION_REQUIRED_WEB=true.
 */
const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { status, isPro, subscriptionRequired } = useSubscription();

  if (!subscriptionRequired || isPro) {
    return <>{children}</>;
  }

  if (status === "loading" || status === "unknown") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <Navigate
      to="/app/paywall"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
};

export default RequireSubscription;
