import { useNavigate, useLocation } from "react-router-dom";
import { useT, type TranslationKey } from "@/i18n";

const tabs: { to: string; label: TranslationKey; primary?: boolean }[] = [
  { to: "/app/today", label: "nav.today" },
  { to: "/app/insights", label: "nav.insights" },
  { to: "/app/log", label: "nav.log", primary: true },
  { to: "/app/history", label: "nav.history" },
  { to: "/app/profile", label: "nav.profile" },
];

const HIDDEN = ["/app/welcome", "/app/log", "/app/analyze"];

/**
 * In-app tab bar. Uses buttons + navigate() instead of <a href> so Capacitor
 * does not treat tab taps as full document loads (which re-run auth and look
 * like a refresh that never leaves the page).
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  if (HIDDEN.includes(location.pathname) || location.pathname.startsWith("/app/onboarding")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-lg mx-auto">
        {tabs.map(({ to, label, primary }) => {
          const isActive = location.pathname === to;
          return (
            <button
              key={to}
              type="button"
              onClick={() => {
                if (!isActive) navigate(to);
              }}
              className={`flex items-center justify-center transition-all ${
                primary
                  ? "shrink-0 mx-1"
                  : isActive
                  ? "flex-1 min-w-0 text-primary"
                  : "flex-1 min-w-0 text-muted-foreground hover:text-foreground"
              }`}
            >
              {primary ? (
                <span className="gradient-glow rounded-full px-4 py-2 -mt-5 shadow-glow text-primary-foreground text-xs font-bold uppercase tracking-wide">
                  {t(label)}
                </span>
              ) : (
                <span className="text-xs font-semibold py-2 px-1 truncate">{t(label)}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
