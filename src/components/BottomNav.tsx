import { NavLink, useLocation } from "react-router-dom";
import { Home, Camera, Dumbbell, User, BarChart3 } from "lucide-react";

const tabs = [
  { to: "/home", icon: Home, label: "Today" },
  { to: "/insights", icon: BarChart3, label: "Insights" },
  { to: "/camera", icon: Camera, label: "Log", primary: true },
  { to: "/workouts", icon: Dumbbell, label: "Workouts" },
  { to: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();

  // Hide on onboarding routes
  if (["/", "/goals", "/profile-setup", "/calorie-target", "/permissions"].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around px-2 pt-2 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                primary
                  ? ""
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {primary ? (
              <div className="gradient-glow rounded-2xl p-3 -mt-5 shadow-glow">
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
