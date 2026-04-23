import { Navigate, useLocation } from "react-router-dom";
import { getProfile } from "@/lib/profile";

const RequireOnboarding = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const profile = getProfile();
  if (!profile) {
    return <Navigate to="/app/welcome" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireOnboarding;
