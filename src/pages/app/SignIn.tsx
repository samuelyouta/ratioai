import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  signInWithOAuth,
  getEmailRedirectUrl,
  formatOAuthError,
  browserPendingMessage,
  consumeAuthRedirect,
} from "@/lib/auth";
import { syncUserData } from "@/lib/userSync";
import { getProfile } from "@/lib/profile";

/**
 * Sign-in gate shown after onboarding completes and before the paywall / app.
 * Three options: Apple, Google, Email (magic link).
 */
const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; error?: string } | null)?.from || "/app/today";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(
    (location.state as { error?: string } | null)?.error ?? null,
  );

  useEffect(() => {
    if ((location.state as { error?: string } | null)?.error) {
      navigate(location.pathname, { replace: true, state: { from } });
    }
  }, [from, location.pathname, location.state, navigate]);

  const finishNativeSession = async () => {
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) {
      setErr("Signed in, but no account was created. Try again.");
      return;
    }
    await syncUserData(userResult.user.id);
    const next = getProfile() ? consumeAuthRedirect(from) : "/app/welcome";
    navigate(next, { replace: true });
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setErr(null);
    setPending(null);
    setBusy(provider);
    try {
      const { error, cancelled, nativeSession, browserPending } = await signInWithOAuth(provider, from);
      if (cancelled) return;
      if (error) {
        setErr(formatOAuthError(provider, error));
        return;
      }
      if (browserPending) {
        setPending(browserPendingMessage(provider));
        return;
      }
      if (nativeSession) {
        await finishNativeSession();
      }
    } catch (e) {
      console.error(e);
      setErr("Sign-in failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErr("Enter a valid email.");
      return;
    }
    setBusy("email");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: getEmailRedirectUrl(from),
        shouldCreateUser: true,
      },
    });
    setBusy(null);
    if (error) {
      setErr("Could not send link. Try again.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1 w-full bg-muted">
        <div className="h-full w-full gradient-glow" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="w-full max-w-sm"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-3 text-center">
            One last step
          </p>
          <h1 className="text-3xl font-bold text-foreground text-center leading-tight">
            Save your plan
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
            Create your account so your streaks, meals, and targets follow you across devices.
          </p>

          <div className="mt-8 space-y-3">
            {/* Apple */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOAuth("apple")}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-3 bg-foreground text-background rounded-xl px-4 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {busy === "apple" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM236.5 105.8c22.2-26.4 20.2-50.4 19.6-59.1-19.7 1.1-42.5 13.4-55.5 28.5-14.3 16.2-22.7 36.2-20.9 58.7 21.3 1.6 40.7-9.4 56.8-28.1z"/>
                </svg>
              )}
              Continue with Apple
            </motion.button>

            {/* Google */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOAuth("google")}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-semibold text-foreground hover:border-primary/60 transition-colors disabled:opacity-60"
            >
              {busy === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5l-6-5.1C29 35.5 26.6 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.8l6 5.1c4.2-3.9 6.6-9.6 6.6-15.4 0-1.3-.1-2.4-.4-3z"/>
                </svg>
              )}
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email */}
            {sent ? (
              <div className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3.5 text-sm text-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Check your inbox for the sign-in link.
              </div>
            ) : (
              <form onSubmit={handleEmail} className="space-y-2">
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (err) setErr(null);
                  }}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                  maxLength={255}
                />
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {busy === "email" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send sign-in link
                </button>
              </form>
            )}

            {pending && (
              <p className="text-primary text-xs text-center pt-1 leading-relaxed">{pending}</p>
            )}
            {err && <p className="text-destructive text-xs text-center pt-1">{err}</p>}
          </div>

          <p className="mt-8 text-[11px] text-muted-foreground text-center leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-primary">Terms</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
