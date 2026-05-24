import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle, Loader2, Camera, Brain, TrendingUp, Sparkles } from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpg";
import NativeFeaturesPanel from "@/components/NativeFeaturesPanel";
import AuthOptions from "@/components/auth/AuthOptions";

import appPreview1 from "@/assets/app-preview-1.png";
import appPreview2 from "@/assets/app-preview-2.png";
import appPreview3 from "@/assets/app-preview-3.png";

const features = [
  {
    icon: Camera,
    title: "Snap & Track",
    description: "Take a photo of your meal and let AI do the rest",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description: "Instant macro breakdown with USDA-verified data",
  },
  {
    icon: TrendingUp,
    title: "Smart Insights",
    description: "Personalized nutrition goals that adapt to you",
  },
];

const previews = [
  { src: appPreview1, alt: "RatioAi profile setup", label: "Your Profile" },
  { src: appPreview2, alt: "RatioAi daily tracking dashboard", label: "Track Daily" },
  { src: appPreview3, alt: "RatioAi AI food analysis", label: "AI Analysis" },
];

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activePreview, setActivePreview] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActivePreview((prev) => (prev + 1) % previews.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const { data, error } = await supabase.from("waitlist").insert({ email: trimmed }).select("id, email").single();

    if (error) {
      if (error.code === "23505") {
        setStatus("success");
      } else {
        setErrorMsg("Something went wrong. Try again.");
        setStatus("error");
      }
    } else {
      setStatus("success");
      // Fire-and-forget welcome email
      if (data) {
        supabase.functions.invoke("send-welcome-email", {
          body: { email: data.email, id: data.id },
        }).catch(console.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-12 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-primary/3 blur-[100px] pointer-events-none" />

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-2xl overflow-hidden shadow-glow mb-5"
        >
          <img src={logo} alt="RatioAi logo" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
          RatioAi
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6">
          AI-powered nutrition tracking is almost here. Join the waitlist to get early access.
        </p>

        {/* Email form */}
        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 mb-10"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground font-semibold text-center leading-snug">
              Waitlist joined.<br />
              Status: <span className="text-primary">Early Adopter</span>.<br />
              Vibe: <span className="text-primary">Elite</span>.<br />
            </p>
            <p className="text-muted-foreground text-xs">See you inside soon. 🚀</p>
          </motion.div>
        ) : (
          <div className="w-full space-y-4 mb-10">
            <AuthOptions redirectPath="/app" />

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or join waitlist</span>
              <div className="flex-1 h-px bg-border" />
            </div>

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
              <p className="text-[11px] text-muted-foreground text-center">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </div>
        )}
      </motion.div>

      {/* App Preview Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="z-10 w-full max-w-sm mb-10"
      >
        <div className="relative h-[420px] flex items-center justify-center">
          {previews.map((preview, index) => {
            const isActive = index === activePreview;
            const offset = index - activePreview;
            return (
              <motion.div
                key={index}
                animate={{
                  scale: isActive ? 1 : 0.85,
                  x: offset * 60,
                  zIndex: isActive ? 10 : 5 - Math.abs(offset),
                  opacity: isActive ? 1 : 0.4,
                  rotateY: offset * -5,
                }}
                transition={{ type: "spring", stiffness: 180, damping: 24, mass: 0.8 }}
                className="absolute w-52 cursor-pointer"
                onClick={() => setActivePreview(index)}
              >
                <div className={`rounded-2xl overflow-hidden border-2 transition-colors duration-300 ${isActive ? 'border-primary/40 shadow-glow' : 'border-border/30'}`}>
                  <img
                    src={preview.src}
                    alt={preview.alt}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {previews.map((preview, index) => (
            <button
              key={index}
              onClick={() => setActivePreview(index)}
              className={`transition-all duration-300 rounded-full ${
                index === activePreview
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30'
              }`}
              aria-label={preview.label}
            />
          ))}
        </div>
      </motion.div>


      {/* Feature highlights */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="z-10 w-full max-w-sm space-y-3"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            What's coming
          </span>
        </div>

        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-start gap-4 p-4 rounded-xl bg-card/60 border border-border/50"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
            </div>
          </motion.div>
        ))}

        <NativeFeaturesPanel email={status === "success" ? email.trim().toLowerCase() : undefined} />

        <a
          href="/app"
          className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors pt-4"
        >
          Open the RatioAi preview →
        </a>

        <div className="flex items-center justify-center gap-2 pt-2 pb-2">
          <a href="/privacy" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            Privacy
          </a>
          <span className="text-muted-foreground/30 text-[11px]">·</span>
          <a href="/terms" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            Terms
          </a>
        </div>
      </motion.div>


    </div>
  );
};

export default Waitlist;
