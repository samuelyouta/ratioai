import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_EMAIL,
  DEMO_USER_ID,
  isDemoMode,
  onDemoModeChange,
} from "@/lib/demoMode";

type AuthStatus = "loading" | "in" | "out";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  isDemo: boolean;
}

/** Local stand-in user for App Review demo mode — never hits Supabase. */
const DEMO_USER = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "demo" },
  user_metadata: { full_name: "App Review" },
  created_at: new Date(0).toISOString(),
} as unknown as User;

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single auth subscription for the whole app.
 * RequireAuth must not call getSession() on every route or tab changes flash-reload.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(() => isDemoMode());

  useEffect(() => onDemoModeChange(() => setDemo(isDemoMode())), []);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setStatus(next?.user ? "in" : "out");
    };

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      apply(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: demo ? "in" : status,
      session,
      user: session?.user ?? (demo ? DEMO_USER : null),
      isDemo: demo,
    }),
    [status, session, demo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
