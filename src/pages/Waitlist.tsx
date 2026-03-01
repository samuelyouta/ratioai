import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpg";

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const { error } = await supabase.from("waitlist").insert({ email: trimmed });

    if (error) {
      if (error.code === "23505") {
        setStatus("success"); // already on waitlist, treat as success
      } else {
        setErrorMsg("Something went wrong. Try again.");
        setStatus("error");
      }
    } else {
      setStatus("success");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-3xl overflow-hidden shadow-glow mb-6"
        >
          <img src={logo} alt="RatioAi logo" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
          RatioAi
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-8">
          AI-powered nutrition tracking is almost here. Join the waitlist to get early access.
        </p>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground font-semibold">You're on the list!</p>
            <p className="text-muted-foreground text-xs">We'll let you know when RatioAi launches.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              maxLength={255}
              required
            />
            {status === "error" && (
              <p className="text-destructive text-xs">{errorMsg}</p>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={status === "loading"}
              className="gradient-glow text-primary-foreground font-semibold text-sm px-6 py-3.5 rounded-xl shadow-glow flex items-center gap-2 w-full justify-center disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Join Waitlist <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        )}

        <p className="text-[11px] text-muted-foreground mt-6">
          No spam. Unsubscribe anytime.
        </p>
      </motion.div>
    </div>
  );
};

export default Waitlist;
