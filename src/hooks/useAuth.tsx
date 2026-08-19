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

type AuthStatus = "loading" | "in" | "out";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single auth subscription for the whole app.
 * RequireAuth must not call getSession() on every route or tab changes flash-reload.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

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
      status,
      session,
      user: session?.user ?? null,
    }),
    [status, session],
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
