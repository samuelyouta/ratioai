import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.jpg";
import scanDemo from "@/assets/scan-demo.mp4.asset.json";

const AppWelcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center z-10"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-3xl overflow-hidden shadow-glow mb-8"
        >
          <img src={logo} alt="RatioAi logo" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">RatioAi</h1>
        <p className="text-muted-foreground text-base max-w-xs leading-relaxed mb-8">
          Snap a photo. Get instant calories. No guessing, no typing, no stress.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-[240px] aspect-[9/16] rounded-3xl overflow-hidden shadow-glow mb-8 bg-card border border-border"
        >
          <video
            src={scanDemo.url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-xs">
          {["📸 Photo AI", "🔬 Hidden Ingredients", "📊 7-Day Trends", "🌍 200+ Cuisines"].map((tag) => (
            <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/app/onboarding/goal")}
          className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full max-w-xs justify-center"
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </motion.button>

        <p className="text-xs text-muted-foreground mt-4">Free · No credit card · 2 min setup</p>
      </motion.div>
    </div>
  );
};

export default AppWelcome;
