import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { signInWithOAuth, getEmailRedirectUrl, formatOAuthError, consumeAuthRedirect } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { syncUserData } from "@/lib/userSync";
import { getProfile } from "@/lib/profile";

interface AuthOptionsProps {
  /** Optional path to send the user to after successful auth (email magic link redirect). */
  redirectPath?: string;
  /** Compact mode renders smaller spacing for embedding inside dense layouts. */
  compact?: boolean;
}

/**
 * Reusable Google + email sign-in card.
 * - Google uses native SocialLogin on device, Supabase OAuth on web.
 * - Email uses Supabase magic link (passwordless).
 */
const AuthOptions = ({ redirectPath = "/app", compact }: AuthOptionsProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const finishNativeSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setErr("Signed in, but no session was created. Try again.");
      return;
    }
    await syncUserData(session.user.id);
    const next = getProfile() ? consumeAuthRedirect(redirectPath) : "/app/welcome";
    navigate(next, { replace: true });
  };

  const handleGoogle = async () => {
    setErr(null);
    setBusy("google");
    try {
      const { error, cancelled, nativeSession, browserPending } = await signInWithOAuth("google", redirectPath);
      if (cancelled) return;
      if (error) {
        setErr(formatOAuthError("google", error));
        return;
      }
      if (browserPending) return;
      if (nativeSession) {
        await finishNativeSession();
      }
    } catch (e) {
      console.error(e);
      setErr("Google sign-in failed. Try again.");
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
        emailRedirectTo: getEmailRedirectUrl(redirectPath),
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
    <div className={`w-full ${compact ? "space-y-2" : "space-y-3"}`}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleGoogle}
        disabled={busy !== null}
        className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/60 transition-colors disabled:opacity-60"
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

      {sent ? (
        <div className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-sm text-foreground">
          <CheckCircle className="w-4 h-4 text-primary" />
          Check your inbox for the RatioAi signup link.
        </div>
      ) : (
        <form onSubmit={handleEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (err) setErr(null);
            }}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
            maxLength={255}
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="bg-secondary border border-border rounded-xl px-4 text-sm font-semibold text-foreground hover:border-primary/60 transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          </button>
        </form>
      )}

      {err && <p className="text-destructive text-xs text-center">{err}</p>}
    </div>
  );
};

export default AuthOptions;
