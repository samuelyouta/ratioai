import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/app/today", label: "Today" },
  { to: "/app/insights", label: "Insights" },
  { to: "/app/log", label: "Log", primary: true },
  { to: "/app/history", label: "History" },
  { to: "/app/profile", label: "Profile" },
];

const HIDDEN = ["/app/welcome", "/app/log", "/app/analyze"];

const BottomNav = () => {
  const location = useLocation();
  if (HIDDEN.includes(location.pathname) || location.pathname.startsWith("/app/onboarding")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-lg mx-auto">
        {tabs.map(({ to, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-center transition-all ${
                primary
                  ? ""
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {primary ? (
              <span className="gradient-glow rounded-full px-5 py-2 -mt-5 shadow-glow text-primary-foreground text-xs font-bold uppercase tracking-wide">
                {label}
              </span>
            ) : (
              <span className="text-xs font-semibold py-2 px-3">{label}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
