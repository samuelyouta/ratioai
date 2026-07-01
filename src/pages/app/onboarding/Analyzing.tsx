import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  "Parsing biological framework...",
  "Calibrating protein satiety index...",
  "Optimizing computer-vision volume models...",
];

const STEP_MS = 800;
const TOTAL_MS = 2500;

const Analyzing = () => {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setInterval(
      () => setI((p) => Math.min(p + 1, STEPS.length - 1)),
      STEP_MS,
    );
    const tLeave = setTimeout(() => setLeaving(true), TOTAL_MS - 350);
    const tNav = setTimeout(() => navigate("/app/signin", { replace: true }), TOTAL_MS);
    return () => {
      clearInterval(t1);
      clearTimeout(tLeave);
      clearTimeout(tNav);
    };
  }, [navigate]);

  return (
    <motion.div
      animate={{ x: leaving ? "-100%" : "0%", opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.35, ease: "easeIn" }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Top progress line — fully filled by end */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full gradient-glow"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: TOTAL_MS / 1000, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Radar sweep */}
        <div className="relative w-56 h-56 mb-12">
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <div className="absolute inset-6 rounded-full border border-primary/15" />
          <div className="absolute inset-12 rounded-full border border-primary/10" />
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.55) 60deg, transparent 90deg)",
              animation: "spin 1.4s linear infinite",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary shadow-glow" />
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-3">
          AI Model Synthesis
        </p>

        <div className="h-8 relative w-full max-w-sm text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-base text-muted-foreground tracking-wide"
            >
              {STEPS[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Analyzing;
