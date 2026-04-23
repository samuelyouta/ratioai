import { NavLink, useLocation } from "react-router-dom";
import { Home, Camera, User, BarChart3, History as HistoryIcon } from "lucide-react";

const tabs = [
  { to: "/app/today", icon: Home, label: "Today" },
  { to: "/app/insights", icon: BarChart3, label: "Insights" },
  { to: "/app/log", icon: Camera, label: "Log", primary: true },
  { to: "/app/history", icon: HistoryIcon, label: "History" },
  { to: "/app/profile", icon: User, label: "Profile" },
];

const HIDDEN = ["/app/welcome", "/app/log", "/app/analyze"];

const BottomNav = () => {
  const location = useLocation();
  if (HIDDEN.includes(location.pathname) || location.pathname.startsWith("/app/onboarding")) {
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
